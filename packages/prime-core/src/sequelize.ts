import { Sequelize } from 'sequelize-typescript';

const { DATABASE_URL, HEROKU_APP_NAME } = process.env;
const { Op } = Sequelize;

if (!DATABASE_URL || DATABASE_URL === '') {
  throw new Error('DATABASE_URL not set');
}

export const sequelize = new Sequelize({
  dialect: 'postgres',
  modelPaths: [`${__dirname}/models`],
  operatorsAliases: Op as any,
  logging: false,
  url: DATABASE_URL,
  dialectOptions: {
    ssl: String(DATABASE_URL).indexOf('ssl=true') >= 0 || (HEROKU_APP_NAME && String(DATABASE_URL).indexOf('amazonaws.com') >= 0),
  },
});
