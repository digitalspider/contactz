const pg = require('pg');
const httpService = require('./httpService');
const secretService = require('./secretService');
const constants = require('./constants');
const httpStatus = constants.HTTP_STATUS;

const TABLE = {
  USERS: 'users',
  GROUPS: 'groups',
  TAG: 'tag',
  CONTACT: 'contact',
  ADDRESS: 'address',
  ORG: 'org',
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
  return [TABLE.TAG, TABLE.GROUPS].includes(tableName) ? COLUMN.NAME : COLUMN.UUID;
}

const columnDataCache = {};

async function getTableColumnData(tableName) {
  if (columnDataCache[tableName]) {
    return columnDataCache[tableName];
  }
  const sqlQuery = `select column_name,is_nullable,data_type from information_schema.columns where table_name = $1`;
  const values = [tableName];
  const result = await executeSqlQuery(sqlQuery, values);
  if (result.rowCount === 0) {
    throw new httpService.NotFoundError(`Table has no rows! TableName= ${tableName}`);
  }
  const columnData = result.rows
    .filter((row) => !['id', 'uuid', 'created_by', 'created_at', 'updated_at', 'deleted_at'].includes(row.column_name))
    .map((row) => ({
      name: row.column_name,
      nullable: row.is_nullable,
      data_type: row.data_type,
    })
    );
  columnDataCache[tableName] = columnData;
  return columnData;
}

async function getInsertData(userId, tableName, body) {
  const columnData = await getTableColumnData(tableName);
  const params = ['$1'];
  const columnNames = [COLUMN.CREATED_BY];
  const values = [userId];
  columnData.map((column) => {
    const columnValue = body[column.name];
    if (columnValue) {
      columnNames.push(column.name)
      params.push(`\$${params.length + 1}`);
      values.push(columnValue);
    }
  });
  if (values.length === 1) {
    throw new Error(`No data to insert for ${tableName}`);
  }
  const result = {
    columnNames: columnNames.join(','),
    params: params.join(','),
    values,
  };
  return result;
}

async function getUpdateData(userId, tableName, body) {
  const columnData = await getTableColumnData(tableName);
  const params = [`${COLUMN.UPDATED_AT} = now()`];
  const values = [];
  columnData.map((column) => {
    const columnValue = body[column.name];
    if (columnValue) {
      params.push(`${column.name} = \$${params.length + 2}`);
      values.push(columnValue);
    }
  });
  if (values.length === 0) {
    throw new Error(`No data to update for ${tableName}`);
  }
  const result = {
    params: params.join(','),
    values,
  };
  return result;
}

async function validate(tableName, userId, id) {
  const createdByClause = [TABLE.USERS].includes(tableName) ? '' : `, ${COLUMN.CREATED_BY}`;
  const uidColumn = getUidColumn(tableName);
  const sqlQuery = `select id ${createdByClause} from ${tableName} where ${uidColumn} = $1 and ${DELETED_AT_CLAUSE}`;
  const values = [id];
  const result = await executeSqlQuery(sqlQuery, values);
  if (result.rowCount === 0) {
    throw new httpService.NotFoundError(`No entity with id: ${id}`);
  }
  const foundEntity = result.rows[0];
  const entityId = createdByClause ? Number(foundEntity[COLUMN.CREATED_BY]) : Number(foundEntity[COLUMN.ID]);
  if (entityId !== userId) {
    throw new httpService.BadRequestError(`Permission denied`, httpStatus.FORBIDDEN);
  }
}

async function count(tableName, userId, searchTerm) {
  const searchParam = searchTerm ? `%${searchTerm}%` : '%';
  const searchColumn = getSearchColumn(tableName);
  const createdByColumn = getCreatedByColumn(tableName);
  const sqlQuery = `select count(1) as count from ${tableName} where ${createdByColumn} = $1 and ${searchColumn} like $2 and ${DELETED_AT_CLAUSE}`;
  const values = [userId, searchParam];
  const results = await executeSqlQuery(sqlQuery, values);
  if (results.rowCount > 0) {
    return Number(results.rows[0]['count']);
  }
  return 0;
}

async function list(tableName, userId, searchTerm, pageSize = 20, page = 0) {
  const total = await count(tableName, userId, searchTerm);
  const offset = page * pageSize;
  const limit = pageSize;
  const pages = Math.ceil(total / pageSize);
  let formattedResults = [];
  if (total > 0) {
    const searchParam = searchTerm ? `%${searchTerm}%` : '%';
    const searchColumn = getSearchColumn(tableName);
    const createdByColumn = getCreatedByColumn(tableName);
    const sqlQuery = `select * from ${tableName} where ${createdByColumn} = $1 and ${searchColumn} like $2 and ${DELETED_AT_CLAUSE} offset ${offset} limit ${limit}`;
    const values = [userId, searchParam];
    const results = await executeSqlQuery(sqlQuery, values);
    formattedResults = results.rows.map((row) => { delete row.id; delete row.password; return row });
  }
  return {
    total,
    page,
    pageSize,
    pages,
    results: formattedResults,
  }
}

async function create(tableName, userId, body) {
  const uidColumn = getUidColumn(tableName);
  const insertData = await getInsertData(userId, tableName, body);
  console.log(insertData);
  const sqlQuery = `insert into ${tableName} (${insertData.columnNames}) VALUES (${insertData.params}) RETURNING ${uidColumn}`;
  const results = await executeSqlQuery(sqlQuery, insertData.values);
  return results.rowCount > 0 ? { [uidColumn]: results.rows[0][uidColumn] } : null;
}

async function getById(tableName, userId, id) {
  // await validate(tableName, userId, id); // Can't validate :(
  const createdByColumn = getCreatedByColumn(tableName);
  const sqlQuery = `select * from ${tableName} where ${createdByColumn} = $1 and id = $2`;
  const values = [userId, id];
  const results = await executeSqlQuery(sqlQuery, values);
  return results.rows.map((row) => { delete row.id; delete row.password; delete row[createdByColumn]; return row })[0];
}

async function getId(tableName, userId, id) {
  await validate(tableName, userId, id);
  const createdByColumn = getCreatedByColumn(tableName);
  const uidColumn = getUidColumn(tableName);
  const sqlQuery = `select id from ${tableName} where ${createdByColumn} = $1 and ${uidColumn} = $2`;
  const values = [userId, id];
  const results = await executeSqlQuery(sqlQuery, values);
  return results.rows.map((row) => { delete row.password; return row })[0]['id'];
}

async function get(tableName, userId, id) {
  await validate(tableName, userId, id);
  const createdByColumn = getCreatedByColumn(tableName);
  const uidColumn = getUidColumn(tableName);
  const sqlQuery = `select * from ${tableName} where ${createdByColumn} = $1 and ${uidColumn} = $2`;
  const values = [userId, id];
  const results = await executeSqlQuery(sqlQuery, values);
  return results.rows.map((row) => { delete row.id; delete row.password; delete row[createdByColumn]; return row })[0];
}

async function update(tableName, userId, id, body) {
  await validate(tableName, userId, id);
  const createdByColumn = getCreatedByColumn(tableName);
  const uidColumn = getUidColumn(tableName);
  const updateData = await getUpdateData(userId, tableName, body);
  console.log(updateData);
  const sqlQuery = `update ${tableName} set ${updateData.params} where ${createdByColumn} = $1 and ${uidColumn} = $2 RETURNING ${uidColumn}`;
  const values = [userId, id, ...updateData.values];
  console.log(values);
  const results = await executeSqlQuery(sqlQuery, values);
  return results.rowCount > 0 ? { [uidColumn]: results.rows[0][uidColumn] } : null;
}

async function softDelete(tableName, userId, id) {
  await validate(tableName, userId, id);
  const createdByColumn = getCreatedByColumn(tableName);
  const uidColumn = getUidColumn(tableName);
  const sqlQuery = `update ${tableName} set ${COLUMN.DELETED_AT} = now() where ${createdByColumn} = $1 and ${uidColumn} = $2 RETURNING ${uidColumn}`;
  const values = [userId, id];
  const results = await executeSqlQuery(sqlQuery, values);
  return results.rowCount > 0 ? { [uidColumn]: results.rows[0][uidColumn] } : null;
}

async function hardDelete(tableName, userId, id) {
  await validate(tableName, userId, id);
  const createdByColumn = getCreatedByColumn(tableName);
  const uidColumn = getUidColumn(tableName);
  const sqlQuery = `delete from ${tableName} where ${createdByColumn} = $1 and ${uidColumn} = $2`;
  const values = [userId, id];
  return executeSqlQuery(sqlQuery, values);
}

module.exports = { count, list, get, getId, getById, create, update, softDelete, hardDelete, executeSqlQuery, TABLE, COLUMN };
