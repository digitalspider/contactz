const uuid = require('uuid').v4;
const pg = require('pg');
const utils = require('./utils');
const secretService = require('./secretService');
const constants = require('./constants');
const httpStatus = constants.HTTP_STATUS;

let dbPool;
const tableName = 'contact';

function generateId() {
  return `${uuid().replace(/-/g, '')}`;
}

function init() {
  if (!dbPool) {
    const DB_SECRET = process.env.DB_SECRET;
    if (!DB_SECRET) {
      throw new Error('Application has not been initialized. Environment variable DB_SECRET is missing');
    }
    const dbConfig = secretService.getSecret(DB_SECRET);
    if (!dbConfig) {
      throw new Error(`Application has not been initialized. SecretManager variable is missing: ${DB_SECRET}`);
    }
    const config = {
      user: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.dbname,
      host: dbConfig.host,
      port: dbConfig.port,
      max: 10
    };
    dbPool = new pg.Pool(config);
  }
  return dbPool;
}

async function executeSqlQuery(sqlQuery, values) {
  let client = null;
  try {
    const dbPool = init();
    if (!dbPool) {
      throw new Error(`Database pool has not been configured correctly!`);
    }
    client = await dbPool.connect();
    if (typeof sqlQuery === 'string') {
      return await client.query(sqlQuery, values);
    }
  } finally {
    client && client.release();
  }
}

async function validate(userId, id) {
  const sqlQuery = `select id, owner from ${tableName} where id = $1 and (deleted_at is null or deleted_at > now())`;
  const values = [id];
  const result = await executeSqlQuery(sqlQuery, values);
  if (result && result.rows.length === 0) {
    throw new utils.NotFoundError(`No entity with id: ${id}`);
  }
  const foundEntity = result.rows[0];
  if (foundEntity.owner !== userId) {
    throw new utils.BadRequestError(`Permission denied`, httpStatus.FORBIDDEN);
  }
}

async function list(userId, searchTerm) {
  const searchParam = searchTerm ? `%${searchTerm}%` : '%';
  const sqlQuery = `select * from ${tableName} where owner = $1 and name like $2 and (deleted_at is null or deleted_at > now())`;
  const values = [userId, searchParam];
  const results = await executeSqlQuery(sqlQuery, values);
  return results.rows;
}

async function create(userId, body) {
  const id = generateId();
  const sqlQuery = `insert into ${tableName} (owner, id, name) VALUES ($1, $2, $3)`;
  const values = [userId, id, body.name];
  return executeSqlQuery(sqlQuery, values);
}

async function get(userId, id) {
  await validate(userId, id);
  const sqlQuery = `select * from ${tableName} where owner = $1 and id = $2`;
  const values = [userId, id];
  const results = await executeSqlQuery(sqlQuery, values);
  return results.rows[0];
}

async function update(userId, id, body) {
  await validate(userId, id);
  const sqlQuery = `update ${tableName} set name = $3 where owner = $1 and id = $2`;
  const values = [userId, id, body.name];
  return executeSqlQuery(sqlQuery, values);
}

async function softDelete(userId, id) {
  await validate(userId, id);
  const sqlQuery = `update ${tableName} set deleted_at = now() where owner = $1 and id = $2`;
  const values = [userId, id];
  return executeSqlQuery(sqlQuery, values);
}

async function hardDelete(userId, id) {
  await validate(userId, id);
  const sqlQuery = `delete from ${tableName} where owner = $1 and id = $2`;
  const values = [userId, id];
  return executeSqlQuery(sqlQuery, values);
}

module.exports = {list, get, create, update, softDelete, hardDelete};
