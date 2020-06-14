const pg = require('pg');
const httpService = require('./httpService');
const secretService = require('./secretService');
const constants = require('./constants');
const httpStatus = constants.HTTP_STATUS;

const TABLE = {
  USERS: 'users',
};

const COLUMN = {
  ID: 'id',
  UUID: 'uuid',
  NAME: 'name',
  USERNAME: 'username',
  PASSWORD: 'password',
  CREATED_BY: 'created_by',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
  DELETED_AT: 'deleted_at',
};
const DELETED_AT_CLAUSE = `(${COLUMN.DELETED_AT} is null or ${COLUMN.DELETED_AT} > now())`;

let dbPool;

async function init() {
  if (!dbPool) {
    const DB_SECRET = process.env.DB_SECRET;
    if (!DB_SECRET) {
      throw new Error('Application has not been initialized. Environment variable DB_SECRET is missing');
    }
    const dbConfig = await secretService.getSecret(DB_SECRET);
    if (!dbConfig) {
      throw new Error(`Application has not been initialized. SecretManager variable is missing: ${DB_SECRET}`);
    }
    const config = {
      user: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.dbname,
      host: dbConfig.host,
      port: dbConfig.port,
      max: 10,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 30000,
    };
    dbPool = new pg.Pool(config);
  }
  return dbPool;
}

async function executeSqlQuery(sqlQuery, values) {
  let client = null;
  try {
    const dbPool = await init();
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

function getSearchColumn(tableName) {
  return [TABLE.USERS].includes(tableName) ? COLUMN.USERNAME : COLUMN.NAME;
}
function getCreatedByColumn(tableName) {
  return [TABLE.USERS].includes(tableName) ? COLUMN.ID : COLUMN.CREATED_BY;
}
function getUidColumn(tableName) {
  return ['tag', 'groups'].includes(tableName) ? COLUMN.NAME : COLUMN.UUID;
}

async function validate(tableName, userId, id) {
  const createdByClause = [TABLE.USERS].includes(tableName) ? '' : `, ${COLUMN.CREATED_BY}`;
  const uidColumn = getUidColumn(tableName);
  const sqlQuery = `select id ${createdByClause} from ${tableName} where ${uidColumn} = $1 and ${DELETED_AT_CLAUSE}`;
  const values = [id];
  const result = await executeSqlQuery(sqlQuery, values);
  if (result && result.rows.length === 0) {
    throw new httpService.NotFoundError(`No entity with id: ${id}`);
  }
  const foundEntity = result.rows[0];
  const entityId = createdByClause ? foundEntity[COLUMN.CREATED_BY] : foundEntity[COLUMN.ID];
  if (entityId !== userId) {
    throw new httpService.BadRequestError(`Permission denied`, httpStatus.FORBIDDEN);
  }
}

async function list(tableName, userId, searchTerm) {
  const searchParam = searchTerm ? `%${searchTerm}%` : '%';
  const searchColumn = getSearchColumn(tableName);
  const createdByColumn = getCreatedByColumn(tableName);
  const sqlQuery = `select * from ${tableName} where ${createdByColumn} = $1 and ${searchColumn} like $2 and ${DELETED_AT_CLAUSE}`;
  const values = [userId, searchParam];
  const results = await executeSqlQuery(sqlQuery, values);
  return results.rows.map((row) => { delete row.id; delete row.password; return row });
}

async function create(tableName, userId, body) {
  const searchColumn = getSearchColumn(tableName);
  const sqlQuery = `insert into ${tableName} (${COLUMN.CREATED_AT}, ${searchColumn}) VALUES ($1, $2)`;
  const values = [userId, body[searchColumn]];
  return executeSqlQuery(sqlQuery, values);
}

async function get(tableName, userId, id) {
  await validate(tableName, userId, id);
  const createdByColumn = getCreatedByColumn(tableName);
  const uidColumn = getUidColumn(tableName);
  const sqlQuery = `select * from ${tableName} where ${createdByColumn} = $1 and ${uidColumn} = $2`;
  const values = [userId, id];
  const results = await executeSqlQuery(sqlQuery, values);
  return results.rows.map((row) => { delete row.id; delete row.password; return row })[0];
}

async function update(tableName, userId, id, body) {
  await validate(tableName, userId, id);
  const searchColumn = getSearchColumn(tableName);
  const createdByColumn = getCreatedByColumn(tableName);
  const uidColumn = getUidColumn(tableName);
  const sqlQuery = `update ${tableName} set ${searchColumn} = $3, ${COLUMN.UPDATED_AT}=now() where ${createdByColumn} = $1 and ${uidColumn} = $2`;
  const values = [userId, id, body.name];
  return executeSqlQuery(sqlQuery, values);
}

async function softDelete(tableName, userId, id) {
  await validate(tableName, userId, id);
  const createdByColumn = getCreatedByColumn(tableName);
  const uidColumn = getUidColumn(tableName);
  const sqlQuery = `update ${tableName} set ${COLUMN.DELETED_AT} = now() where ${createdByColumn} = $1 and ${uidColumn} = $2`;
  const values = [userId, id];
  return executeSqlQuery(sqlQuery, values);
}

async function hardDelete(tableName, userId, id) {
  await validate(tableName, userId, id);
  const createdByColumn = getCreatedByColumn(tableName);
  const uidColumn = getUidColumn(tableName);
  const sqlQuery = `delete from ${tableName} where ${createdByColumn} = $1 and ${uidColumn} = $2`;
  const values = [userId, id];
  return executeSqlQuery(sqlQuery, values);
}

module.exports = { list, get, create, update, softDelete, hardDelete, executeSqlQuery, TABLE, COLUMN };
