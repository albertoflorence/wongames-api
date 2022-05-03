from strapi/base:14

WORKDIR /opt/app

COPY ./package.json ./
COPY ./package-lock.json ./

RUN npm install --prod

RUN npx browserslist@latest --update-db

COPY . .

ENV NODE_ENV development
ENV DATABASE_CLIENT=postgres

RUN npm run build

EXPOSE 1337
CMD npm start
