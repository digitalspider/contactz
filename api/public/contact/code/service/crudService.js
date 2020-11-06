const dbService = require('./dbService');
const dynamoService = require('./dynamoService');

const { USE_DYNAMO: useDynamo = true } = process.env;
const { VALID_TABLE_NAMES } = dynamoService;

const crud = {
  create: ({ tableName, userId, id, body, searchValue }) => {
    return useDynamo ? dynamoService.crud.create({ tableName, partitionKey: userId, sortKey: id, body, searchValue }) : dbService.create(tableName, userId, body);
  },
  update: ({ tableName, userId, id, body, searchValue }) => {
    return useDynamo ? dynamoService.crud.update({ tableName, partitionKey: userId, sortKey: id, body, searchValue }) : dbService.update(tableName, userId, id, body);
  },
  read: async ({ tableName, userId, id }) => {
    return useDynamo ? dynamoService.crud.read({ tableName, partitionKey: userId, sortKey: id }) : dbService.get(tableName, userId, id);
  },
  search: async ({ tableName, userId, searchOptions }) => {
    return useDynamo ? dynamoService.crud.search({ tableName, partitionKey: userId, searchOptions }) : dbService.list(tableName, userId, searchOptions);
  },
  delete: ({ tableName, userId, id }) => {
    return useDynamo ? dynamoService.crud.delete({ tableName, partitionKey: userId, sortKey: id }) : dbService.softDelete(tableName, userId, id);
  },
  types: () => {
    return useDynamo ? dynamoService.getTypes() : dbService.getTypes();
  },
};

module.exports = { VALID_TABLE_NAMES, crud };
