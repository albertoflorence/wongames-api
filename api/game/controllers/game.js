"use strict";

const { default: createStrapi } = require("strapi");

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */
module.exports = {
  populate: async (ctx) => {
    try {
      const query = {
        sort: "popularity",
        page: "1",
        ...ctx.query,
      };
      await strapi.services.game.populate(query);
      ctx.send();
    } catch (error) {
      console.error(error);
    }
  },
};
