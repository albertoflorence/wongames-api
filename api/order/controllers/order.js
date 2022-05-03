"use strict";
const stripe = require("stripe")(process.env.STRIPE_KEY);
const { sanitizeEntity } = require("strapi-utils");

module.exports = {
  async createPaymentIntent(ctx) {
    const { cart } = ctx.request.body;

    const games = await getCartItems(cart);

    if (games.error) return handleError(ctx, games);

    const total = getTotalInCents(games);

    if (total === 0) {
      return {
        freeGames: true,
      };
    }

    const paymentIntent = await handlePaymentIntent({ amount: total, cart });

    if (paymentIntent.error) return handleError(ctx, paymentIntent);

    return paymentIntent;
  },
  async create(ctx) {
    const { cart, paymentIntentId, paymentMethod } = ctx.request.body;

    const user = await getUserInfo(ctx);

    const games = await getCartItems(cart);
    if (games.error) return handleError(ctx, games);

    const total = getTotalInCents(games);

    const paymentInfo = {
      card_brand: null,
      card_last4: null,
    };

    if (total > 0) {
      try {
        const response = await stripe.paymentMethods.retrieve(paymentMethod);
        paymentInfo.card_brand = response?.card?.brand;
        paymentInfo.card_last4 = response?.card?.last4;
      } catch (error) {
        return handleError(ctx, {
          error: { status: 500, message: error.message },
        });
      }
    }

    const entry = {
      user,
      games,
      total_in_cents: total,
      payment_intent_id: paymentIntentId,
      ...paymentInfo,
    };

    const order = await strapi.services.order.create(entry);
    notifyUser(entry);

    return sanitizeEntity(order, { model: strapi.models.order });
  },
  async find(ctx) {
    const userId = await getUserId(ctx);
    const orders = await strapi.services.order.find({ user: userId });

    return sanitizeEntity(orders, { model: strapi.models.order });
  },
};

const notifyUser = async ({
  user,
  games,
  card_brand,
  card_last4,
  total_in_cents,
}) => {
  await strapi.plugins["email-designer"].services.email.sendTemplatedEmail(
    {
      to: user.email,
      from: "no-replay@wongames.com",
    },
    { templateId: 1 },
    {
      user,
      games,
      payment: {
        total: total_in_cents / 100,
        card_brand: card_brand,
        card_last4: card_last4,
      },
    }
  );
};

const getUserInfo = async (ctx) => {
  const id = await getUserId(ctx);

  const user = await strapi
    .query("user", "users-permissions")
    .findOne({ id }, "Authenticated");

  return user;
};

const getUserId = async (ctx) =>
  (await strapi.plugins["users-permissions"].services.jwt.getToken(ctx)).id;

const handlePaymentIntent = async ({ amount, cart }) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      metadata: {
        integration_check: "accept_a_payment",
        cart: JSON.stringify(cart),
      },
    });
    return paymentIntent;
  } catch (error) {
    return handleError(ctx, {
      error: { status: 500, message: error.raw.message },
    });
  }
};

const getTotalInCents = (games) =>
  Math.round(games.reduce((total, game) => total + game.price, 0) * 100);

const getCartItems = async (cart) => {
  if (!cart)
    return { error: { status: 400, message: "Cart not in the request" } };

  const games = await Promise.all(
    cart.map(
      async (game) =>
        game?.id && (await strapi.services.game.findOne({ id: game.id }))
    )
  );

  const hasInvalidGame = games.some((game) => !game);
  if (hasInvalidGame)
    return {
      error: { status: 400, message: "Your cart has invalid items" },
    };

  if (games.length === 0)
    return { error: { status: 404, message: "Your cart is empty" } };

  return games;
};

const handleError = (ctx, item) => {
  ctx.response.status = item.error.status;
  return item;
};
