"use strict";
const { sanitizeEntity } = require("strapi-utils");

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

const createWishlist = async (ctx, userId) => {
  const body = {
    ...ctx.request.body,
    user: userId,
  };

  const entity = await strapi.services.wishlist.create(body);
  return sanitizeEntity(entity, { model: strapi.models.wishlist });
};

const getUserToken = async (ctx) =>
  await strapi.plugins["users-permissions"].services.jwt.getToken(ctx);

const getWishlist = async (ctx) => {
  const token = await getUserToken(ctx);

  if (!token) return { error: "invalid user" };

  const wishlist =
    (await strapi.services.wishlist.findOne({ user: token.id })) || {};

  wishlist.user = { id: token.id };

  return wishlist;
};

module.exports = {
  async create(ctx) {
    const token = await getUserToken(ctx);
    return await createWishlist(ctx, token.id);
  },
  async update(ctx) {
    const wishlist = await getWishlist(ctx);
    if (wishlist.error) return wishlist;

    if (!wishlist.id) return createWishlist(ctx, wishlist.user.id);

    const entity = await strapi.services.wishlist.update(
      { id: wishlist.id },
      { games: ctx.request.body.games }
    );

    return sanitizeEntity(entity, { model: strapi.models.wishlist });
  },
  async findOne(ctx) {
    const wishlist = await getWishlist(ctx);
    return wishlist;
  },
};
