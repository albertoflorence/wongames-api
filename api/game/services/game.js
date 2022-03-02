"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-services)
 * to customize this service
 */

const axios = require("axios");
const { JSDOM } = require("jsdom");
const slugify = require("slugify");
const FormData = require("form-data");
const qs = require("querystring");

module.exports = {
  populate: async (query) => {
    const url = `https://www.gog.com/games/ajax/filtered?mediaType=game&${qs.stringify(
      query
    )}`;
    const {
      data: { products },
    } = await axios.get(url);

    await Promise.all([
      populateTable("publisher", "publisher", products),
      populateTable("developer", "developer", products),
      populateTable("platform", "supportedOperatingSystems", products),
      populateTable("category", "genres", products),
    ]);

    await createGames(products);
  },
};

const setImage = async (url, game, field) => {
  url = `https:${url}.jpg`;
  const { data } = await axios.get(url, { responseType: "arraybuffer" });
  const buffer = Buffer.from(data, "base64");

  const formData = new FormData();
  formData.append("refId", game.id);
  formData.append("ref", "game");
  formData.append("field", field);
  formData.append("files", buffer, { filename: `${game.slug}.jpg` });

  return await axios({
    method: "POST",
    url: `http://${strapi.config.host}:${strapi.config.port}/upload`,
    data: formData,
    headers: {
      "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
    },
  });
};

const createGames = async (products) =>
  Promise.all(
    products.map(async (product) => {
      const item = await getByName(product.title, "game");
      if (item) return;

      const game = await strapi.services.game.create(await makeGame(product));
      await Promise.all([
        setImage(product.image, game, "cover"),
        ...product.gallery
          .slice(0, 5)
          .map((image) => setImage(image, game, "gallery")),
      ]);
      return game;
    })
  );

const makeGame = async ({
  title,
  slug,
  releaseDate,
  publisher,
  price,
  supportedOperatingSystems,
  genres,
  developer,
}) => ({
  name: title,
  slug: slug.replace(/_/g, "-"),
  price: Number(price.amount),
  release_date: new Date(Number(releaseDate) * 1000).toISOString(),
  publisher: await getByName(publisher, "publisher"),
  developers: await getByName(developer, "developer"),
  categories: await getByNames(genres, "category"),
  platforms: await getByNames(supportedOperatingSystems, "platform"),
  ...(await getGameInfo(slug)),
});

const getGameInfo = async (slug) => {
  const url = `https://www.gog.com/en/game/${slug}`;
  const body = await axios.get(url);
  const DOM = new JSDOM(body.data);

  const description = DOM.window.document.querySelector(".description");
  const rating = DOM.window.document
    .querySelector(".age-restrictions__icon use")
    ?.getAttribute("xlink:href")
    .replace(/[#_]/g, "");

  return {
    description: description.innerHTML,
    short_description: description.textContent.slice(0, 160),
    rating: rating || "BR0",
  };
};

const populateTable = async (entityName, fieldName, products) =>
  Promise.all(
    getUniqueValues(fieldName, products).map((name) => create(name, entityName))
  );

const getUniqueValues = (fieldName, products) => {
  const hashMap = {};
  for (const product of products) {
    const values = [].concat(product[fieldName]);
    for (const name of values) {
      hashMap[name] = true;
    }
  }

  return Object.keys(hashMap);
};

const create = async (name, entityName) => {
  const slug = slugify(name, { strict: true, lower: true });
  const item = await getBySlug(slug, entityName);
  return item ? item : await strapi.services[entityName].create({ name, slug });
};

const getBySlug = async (slug, entityName) => {
  return await strapi.services[entityName].findOne({ slug });
};

const getByNames = async (names, entityName) =>
  Promise.all(names.map((name) => getByName(name, entityName)));

const getByName = async (name, entityName) => {
  return await strapi.services[entityName].findOne({ name });
};
