const pg = require('pg');
const httpService = require('./httpService');
const secretService = require('./secretService');
const cacheService = require('./cacheService');
const logService = require('./logService');
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
      logService.debugSql('sqlQuery', sqlQuery);
      logService.debugSql('values', values);
      const result = await client.query(sqlQuery, values);
      logService.debugSql('result', result.rowCount, result.rows);
      return result;
    }
  } finally {
    client && client.release();
  }
}

function getSearchColumn(tableName) {
  return [TABLE.CONTACT, TABLE.ADDRESS].includes(tableName) ? `${tableName}.search` : [TABLE.USERS].includes(tableName) ? COLUMN.USERNAME : COLUMN.NAME;
}
function getCreatedByColumn(tableName) {
  return [TABLE.USERS].includes(tableName) ? COLUMN.ID : COLUMN.CREATED_BY;
}
function getUidColumn(tableName) {
  return [TABLE.TAG, TABLE.GROUPS].includes(tableName) ? COLUMN.NAME : COLUMN.UUID;
}

async function getTableColumnData(tableName) {
  const cacheContext = cacheService.CONTEXT.TABLE_COLUMN_DATA;
  const cacheResult = cacheService.fromCache(cacheContext, tableName);
  if (cacheResult) {
    return cacheResult;
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
  cacheService.cache(cacheContext, tableName, columnData);
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

async function validate(tableName, userId, uuid) {
  const createdByClause = [TABLE.USERS].includes(tableName) ? '' : `, ${COLUMN.CREATED_BY}`;
  const uidColumn = getUidColumn(tableName);
  const sqlQuery = `select id ${createdByClause} from ${tableName} where ${uidColumn} = $1 and ${DELETED_AT_CLAUSE}`;
  const values = [uuid];
  const result = await executeSqlQuery(sqlQuery, values);
  if (result.rowCount === 0) {
    throw new httpService.NotFoundError(`No entity with id: ${uuid}`);
  }
  const foundEntity = result.rows[0];
  const entityId = createdByClause ? Number(foundEntity[COLUMN.CREATED_BY]) : Number(foundEntity[COLUMN.ID]);
  if (entityId !== userId) {
    throw new httpService.BadRequestError(`Permission denied`, httpStatus.FORBIDDEN);
  }
}

async function count(tableName, userId, searchColumn, searchTerm, searchExact = true) {
  let searchClause = '';
  let searchParam = '';
  if (searchTerm) {
    searchParam = searchExact ? searchTerm : `%${searchTerm}%`;
    searchColumn = searchColumn || getSearchColumn(tableName);
    const searchOperation = searchExact ? '=' : 'ilike';
    searchClause = `and ${searchColumn} ${searchOperation} $2`;
  }
  const createdByColumn = getCreatedByColumn(tableName);
  const sqlQuery = `select count(1) as count from ${tableName} where ${createdByColumn} = $1 ${searchClause} and ${DELETED_AT_CLAUSE}`;
  const values = searchParam ? [userId, searchParam] : [userId];
  const results = await executeSqlQuery(sqlQuery, values);
  if (results.rowCount > 0) {
    return Number(results.rows[0]['count']);
  }
  return 0;
}

async function list(tableName, userId, pageSize = 20, page = 0, searchOptions = {}) {
  let { searchColumn, searchTerm, searchExact, sortColumn, sortOrder } = searchOptions;
  const total = await count(tableName, userId, searchColumn, searchTerm, searchExact);
  const offset = page * pageSize;
  const limit = pageSize;
  const pages = Math.ceil(total / pageSize);
  let formattedResults = [];
  if (total > 0) {
    const uidColumn = getUidColumn(tableName);
    let searchClause = '';
    let searchParam = '';
    if (searchTerm) {
      searchParam = searchExact ? searchTerm : `%${searchTerm}%`;
      searchColumn = searchColumn || getSearchColumn(tableName);
      const searchOperation = exactSearch ? '=' : 'ilike';
      searchClause = `and ${searchColumn} ${searchOperation} $2`;
    }
    let sortClause = '';
    if (sortColumn) {
      const columnData = await getTableColumnData(tableName);
      const foundColumn = columnData.filter((col) => col.name === sortColumn);
      if (foundColumn.length === 1) {
        sortClause = `order by ${sortColumn} ${['asc', 'desc'].includes(sortOrder) ? sortOrder : ''}`
      }
    }
    const createdByColumn = getCreatedByColumn(tableName);
    const sqlQuery = `select * from ${tableName} where ${createdByColumn} = $1 ${searchClause} and ${DELETED_AT_CLAUSE} ${sortClause} offset ${offset} limit ${limit}`;
    const values = searchParam ? [userId, searchParam] : [userId];
    const results = await executeSqlQuery(sqlQuery, values);
    formattedResults = results.rows.map((row) => cleanseRow(row));
    formattedResults.map((data) => cacheService.cache(getCacheContext(tableName, userId), data[uidColumn], Object.assign({}, data)));
  }
  return {
    total,
    page,
    pageSize,
    pages,
    results: formattedResults,
  }
}

function cleanseRow(row) {
  delete row.id;
  delete row.password;
  delete row[COLUMN.CREATED_BY];
  delete row[COLUMN.DELETED_AT];
  return row;
}
async function create(tableName, userId, body) {
  const uidColumn = getUidColumn(tableName);
  const insertData = await getInsertData(userId, tableName, body);
  logService.debug('insertData', insertData);
  const sqlQuery = `insert into ${tableName} (${insertData.columnNames}) VALUES (${insertData.params}) RETURNING ${uidColumn}`;
  const results = await executeSqlQuery(sqlQuery, insertData.values);
  return results.rowCount > 0 ? { [uidColumn]: results.rows[0][uidColumn] } : null;
}

async function getUuidById(tableName, userId, id) {
  // await validate(tableName, userId, id); // Can't validate :(
  const cacheContext = `${tableName}-uuid-id`;
  let result = cacheService.getKeyByValue(cacheContext, id);
  if (result) {
    return result;
  }
  const createdByColumn = getCreatedByColumn(tableName);
  const sqlQuery = `select uuid from ${tableName} where ${createdByColumn} = $1 and id = $2`;
  const values = [userId, id];
  const results = await executeSqlQuery(sqlQuery, values);
  if (results.rowCount > 0) {
    result = results.rows[0]['uuid'];
    cacheService.cache(cacheContext, result, id);
    return result;
  }
}

async function getId(tableName, userId, uuid) {
  await validate(tableName, userId, uuid);
  const cacheContext = `${tableName}-uuid-id`;
  const cacheResult = cacheService.fromCache(cacheContext, uuid);
  if (cacheResult) {
    return cacheResult;
  }
  const createdByColumn = getCreatedByColumn(tableName);
  const uidColumn = getUidColumn(tableName);
  const sqlQuery = `select id from ${tableName} where ${createdByColumn} = $1 and ${uidColumn} = $2`;
  const values = [userId, uuid];
  const results = await executeSqlQuery(sqlQuery, values);
  if (results.rowCount > 0) {
    const result = results.rows[0]['id'];
    cacheService.cache(cacheContext, uuid, result);
    return result;
  }
}

async function get(tableName, userId, uuid) {
  await validate(tableName, userId, uuid);
  const cacheResult = cacheService.fromCache(getCacheContext(tableName, userId), uuid);
  if (cacheResult) {
    return Object.assign({}, cacheResult);
  }
  const createdByColumn = getCreatedByColumn(tableName);
  const uidColumn = getUidColumn(tableName);
  const sqlQuery = `select * from ${tableName} where ${createdByColumn} = $1 and ${uidColumn} = $2`;
  const values = [userId, uuid];
  const results = await executeSqlQuery(sqlQuery, values);
  if (results.rowCount > 0) {
    let result = results.rows.map((row) => cleanseRow(row))[0];
    cacheService.cache(getCacheContext(tableName, userId), uuid, Object.assign({}, result));
    return result;
  }
}

async function update(tableName, userId, uuid, body) {
  await validate(tableName, userId, uuid);
  cacheService.invalidate(getCacheContext(tableName, userId), uuid);
  cacheService.invalidate(`${tableName}-uuid-id`, uuid);
  const createdByColumn = getCreatedByColumn(tableName);
  const uidColumn = getUidColumn(tableName);
  const updateData = await getUpdateData(userId, tableName, body);
  logService.debug('updateData', updateData);
  const sqlQuery = `update ${tableName} set ${updateData.params} where ${createdByColumn} = $1 and ${uidColumn} = $2 RETURNING ${uidColumn}`;
  const values = [userId, uuid, ...updateData.values];
  logService.debug('updateDataValues', values);
  const results = await executeSqlQuery(sqlQuery, values);
  return results.rowCount > 0 ? { [uidColumn]: results.rows[0][uidColumn] } : null;
}

async function softDelete(tableName, userId, uuid) {
  await validate(tableName, userId, uuid);
  cacheService.invalidate(getCacheContext(tableName, userId), uuid);
  cacheService.invalidate(`${tableName}-uuid-id`, uuid);
  const createdByColumn = getCreatedByColumn(tableName);
  const uidColumn = getUidColumn(tableName);
  const sqlQuery = `update ${tableName} set ${COLUMN.DELETED_AT} = now() where ${createdByColumn} = $1 and ${uidColumn} = $2 RETURNING ${uidColumn}`;
  const values = [userId, uuid];
  const results = await executeSqlQuery(sqlQuery, values);
  return results.rowCount > 0 ? { [uidColumn]: results.rows[0][uidColumn] } : null;
}

async function hardDelete(tableName, userId, uuid) {
  await validate(tableName, userId, uuid);
  cacheService.invalidate(getCacheContext(tableName, userId), uuid);
  cacheService.invalidate(`${tableName}-uuid-id`, uuid);
  const createdByColumn = getCreatedByColumn(tableName);
  const uidColumn = getUidColumn(tableName);
  const sqlQuery = `delete from ${tableName} where ${createdByColumn} = $1 and ${uidColumn} = $2`;
  const values = [userId, uuid];
  return executeSqlQuery(sqlQuery, values);
}

async function getTypes() {
  const cacheId = 'ALL';
  const cacheContext = cacheService.CONTEXT.TYPES;
  const cacheResult = cacheService.fromCache(cacheContext, cacheId);
  if (cacheResult) {
    return Object.assign({}, cacheResult);
  }
  const sqlQuery = 'SELECT pg_type.typname as name, pg_enum.enumlabel as value FROM pg_type JOIN pg_enum ON pg_enum.enumtypid = pg_type.oid';
  const values = null;
  const sqlTypes = await executeSqlQuery(sqlQuery, values);
  if (sqlTypes.rowCount > 0) {
    const result = sqlTypes.rows;
    cacheService.cache(cacheContext, cacheId, Object.assign({}, result));
    return result;
  }
}

function getCacheContext(tableName, userId) {
  return `${userId}-get-${tableName}`;
}

module.exports = { count, list, get, getId, getUuidById, getTypes, create, update, softDelete, hardDelete, executeSqlQuery, TABLE, COLUMN };
