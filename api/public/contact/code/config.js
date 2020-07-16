const dotenv = require('dotenv');

dotenv.config();

const appEnv = process.env.appEnv || 'dev';

module.exports = {
  appEnv,
  baseUrl: process.env.baseUrl || `https://api.${appEnv !== 'prod' ? appEnv + '.' : ''}contactz.com.au`,
  dbSecret: process.env.DB_SECRET,
  dbHost: process.env.DB_HOST || 'localhost',
  dbPort: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  dbName: process.env.DB_NAME || 'contactz',
  dbUser: process.env.DB_USER || 'contactz',
  dbPass: process.env.DB_PASS || 'contactz',
};
