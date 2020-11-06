const AWS = require('aws-sdk');

const TABLES = {
  contact: {
    name: 'contact',
    partitionKey: 'pk',
    sortKey: 'sk',
  },
};

let dynamoDB = null;

async function reset() {
  dynamoDB = null;
}

/**
 * Create table for testing purposes only
 * @param {string} tableName
 */
async function createTable(tableName) {
  const { partitionKey, sortKey } = TABLES[tableName].name;
  const params = {
    TableName: tableName,
    KeySchema: [
      { AttributeName: partitionKey, KeyType: 'HASH' },
      { AttributeName: sortKey, KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: partitionKey, AttributeType: 'S' },
      { AttributeName: sortKey, AttributeType: 'S' },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 10,
      WriteCapacityUnits: 10,
    },
    StreamSpecification: {
      StreamEnabled: true,
      StreamViewType: 'NEW_AND_OLD_IMAGES',
    },
  };

  return dynamoDB.createTable(params).promise();
}

function initDynamoDb(options) {
  const { awsConfig = { region: 'ap-southeast-2' } } = options;
  AWS.config.update(awsConfig);
  return new AWS.DynamoDB.DocumentClient();
}

function getDynamoDB(options) {
  if (dynamoDB) {
    return dynamoDB;
  }
  dynamoDB = initDynamoDb(options);
  return dynamoDB;
}

function getDynamoDbStreams() {
  return new AWS.DynamoDBStreams();
}

/**
 * Delete item from dynamo matching partition/sort kes
 * @param {object} params
 * @param {string} params.tableName Table name
 * @param {string} params.partitionKey Partition key value
 * @param {string} params.sortKey Sort  key value
 * @return {Promise<any[]>} List of dynamo items
 */
async function deleteItem({ tableName, partitionKey, sortKey = null }) {
  const table = TABLES[tableName];
  const params = {
    TableName: tableName,
    Key: {
      [table.partitionKey]: {
        S: partitionKey,
      },
    },
  };

  if (sortKey) {
    params.Key[table.sortKey] = {
      S: sortKey,
    };
  }
  const dynamoClient = module.exports.getDynamoDB();
  return dynamoClient.deleteItem(params).promise();
}

/**
 * Get all items from dynamo matching partition/sort kes
 * @param {object} params
 * @param {string} params.tableName Table name
 * @param {string} params.partitionKey Partition key value
 * @param {string} params.sortKey Sort  key value
 * @return {Promise<any>} List of dynamo items
 */
async function getItem({ tableName, partitionKey, sortKey = null }) {
  const table = TABLES[tableName];
  const params = {
    TableName: tableName,
    Key: {
      [table.partitionKey]: {
        S: partitionKey,
      },
    },
  };

  if (sortKey) {
    params.Key[table.sortKey] = {
      S: sortKey,
    };
  }

  const dynamoClient = module.exports.getDynamoDB();
  const response = await dynamoClient.getItem(params).promise();
  return response.Item;
}

/**
 * Write a single item to dynamodb
 * @param {object} params
 * @param {string} params.tableName Table name
 * @param {any} params.item Dynamo item (using { S: 'something'} notation)
 */
async function putItem({ tableName, item }) {
  const params = {
    TableName: tableName,
    Item: item,
  };

  const dynamoClient = module.exports.getDynamoDB();
  return dynamoClient.putItem(params).promise();
}

/**
 * Encapsulate all methods related to contact
 * and hide internal dynamoDb structure
 */
const crud = {
  create: ({ tableName, partitionKey, sortKey, body }) =>
    putItem({
      tableName,
      item: {
        [TABLES.contact.partitionKey]: {
          S: partitionKey,
        },
        [TABLES.contact.sortKey]: {
          S: sortKey,
        },
        ...body,
      },
    }),
  readOne: async ({ partitionKey, sortKey }) => {
    const item = await getItem({
      tableName,
      partitionKey,
      sortKey,
    });
    if (!item) return null;
    return item;
  },
  delete: ({ partitionKey, sortKey }) =>
    deleteItem({
      tableName,
      partitionKey,
      sortKey,
    }),
};

module.exports = { reset, getDynamoDB, getDynamoDbStreams, crud };
