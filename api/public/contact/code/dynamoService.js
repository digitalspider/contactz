const AWS = require('aws-sdk');
const { result } = require('lodash');

const TABLES = {
  contact: {
    name: 'contact',
    partitionKey: 'pk',
    sortKey: 'sk',
  },
  user: {
    name: 'user',
    partitionKey: 'pk',
    sortKey: 'sk',
  },
};

let defaultDynamoDBClient;

async function reset() {
  defaultDynamoDBClient = null;
}

function initDynamoDb(options) {
  const { awsConfig = { region: 'ap-southeast-2' } } = options;
  AWS.config.update(awsConfig);
  return new AWS.DynamoDB.DocumentClient();
}

function getDynamoDB(options) {
  return defaultDynamoDBClient || initDynamoDb(options);
}

function getDynamoDbStreams() {
  return new AWS.DynamoDBStreams();
}

async function deleteItem({ tableName, partitionKey, sortKey }) {
  const dynamoClient = module.exports.getDynamoDB();

  const params = getKeyParams(tableName, partitionKey, sortKey);
  return dynamoClient.deleteItem(params).promise();
}

async function getItem({ tableName, partitionKey, sortKey }) {
  const dynamoClient = module.exports.getDynamoDB();

  const params = getKeyParams(tableName, partitionKey, sortKey);
  const response = await dynamoClient.getItem(params).promise();
  return response.Item;
}

async function update({ tableName, partitionKey, sortKey, item, searchValue }) {
  const dynamoClient = module.exports.getDynamoDB();

  const params = {
    ...getKeyParams(tableName, partitionKey, sortKey),
    UpdateExpression: 'set name=:name, search=:search',
    ExpressionAttributeValues: {
      ':name': item.name,
      ':search': searchValue || item.name,
    },
  };
  return dynamoClient.update(params).promise();
}

async function putItem({ tableName, partitionKey, sortKey, item, searchValue }) {
  const dynamoClient = module.exports.getDynamoDB();

  const table = getTable(tableName);
  const params = {
    TableName: tableName,
    Item: {
      [table.partitionKey]: partitionKey,
      [table.sortKey]: sortKey,
      ...item,
      search: searchValue || item.name,
    },
  };

  return dynamoClient.putItem(params).promise();
}

async function search({ tableName, partitionKey, searchOptions }) {
  const dynamoClient = module.exports.getDynamoDB();

  const table = getTable(tableName);
  let params = {
    TableName: tableName,
    KeyConditionExpression: '#pk = :pk',
    ExpressionAttributeNames: {
      '#pk': table.partitionKey,
    },
    ExpressionAttributeValues: {
      ':pk': partitionKey,
    },
  };
  if (searchOptions) {
    const { searchTerm, searchColumn = 'search', searchExact = true, sortColumn, sortOrder, limit, pageNo } = searchOptions;
    const filterExpression = searchExact ? '#column = :value' : 'contains(#column, :value)';
    params = {
      ...params,
      Limit: limit,
      FilterExpression: filterExpression,
      ExpressionAttributeNames: {
        '#column': searchColumn,
      },
      ExpressionAttributeValues: {
        ':value': searchTerm,
      },
    };
  }

  return dynamoClient.putItem(params).promise();
}

function getTable(tableName) {
  const table = TABLES[tableName];
  if (!table) {
    throw new Error(`Invalid tableName ${tableName}`);
  }
  return table;
}

function getKeyParams(tableName, partitionKey, sortKey) {
  const table = getTable(tableName);
  const params = {
    TableName: tableName,
    Key: {
      [table.partitionKey]: partitionKey,
      [table.sortKey]: sortKey ? sortKey : undefined,
    },
  };
  return params;
}

/**
 * Encapsulate all methods related to contact
 * and hide internal dynamoDb structure
 */
const crud = {
  create: ({ tableName, partitionKey, sortKey, body, searchValue }) =>
    putItem({
      tableName,
      partitionKey,
      sortKey,
      item: body,
      searchValue,
    }),
  update: ({ tableName, partitionKey, sortKey, body, searchValue }) =>
    update({
      tableName,
      partitionKey,
      sortKey,
      item: body,
      searchValue,
    }),
  read: async ({ tableName, partitionKey, sortKey }) => {
    const item = await getItem({
      tableName,
      partitionKey,
      sortKey,
    });
    if (!item) return null;
    return item;
  },
  search: async ({ tableName, partitionKey, searchOptions }) => {
    const results = await search({
      tableName,
      partitionKey,
      searchOptions,
    });
    return results
      ? {
          count: results.Count || 0,
          total: results.ScannedCount || 0,
          results: results.Items || [],
        }
      : {
          count: 0,
          total: 0,
          results: [],
        };
  },
  delete: ({ tableName, partitionKey, sortKey }) =>
    deleteItem({
      tableName,
      partitionKey,
      sortKey,
    }),
};

module.exports = { reset, getDynamoDB, getDynamoDbStreams, crud };
