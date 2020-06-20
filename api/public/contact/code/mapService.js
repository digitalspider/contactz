const dbService = require('./dbService');
const cacheService = require('./cacheService');

const { TABLE } = dbService;
const { CONTACT_UUID_ID } = cacheService.CONTEXT;

async function dbToApi(tableName, userId, body) {
  switch (tableName) {
    case TABLE.ADDRESS:
      return dbToApiAddress(userId, body);
  }
}

async function apiToDb(tableName, userId, body) {
  switch (tableName) {
    case TABLE.ADDRESS:
      return apiToDbAddress(userId, body);
  }
  return body;
}

async function dbToApiAddress(userId, body) {
  const contact_id = Number(body.contact_id);
  let contactUuid = cacheService.getKeyByValue(CONTACT_UUID_ID, contact_id);
  if (!contactUuid) {
    contact = await dbService.getById(TABLE.CONTACT, userId, contact_id);
    if (!contact) {
      throw new Error(`Invalid contact_id does not exist. contact_id=${contact_id}`);
    }
    contactUuid = contact.uuid;
    cacheService.cache(CONTACT_UUID_ID, contact.uuid, contact.id);
  }
  body.contact_id = contactUuid;
  return body;
}

async function apiToDbAddress(userId, body) {
  const { contact_id: contactUuid } = body;
  let contactId = cacheService.fromCache(CONTACT_UUID_ID, contactUuid);
  if (!contactId) {
    contactId = await dbService.getId(TABLE.CONTACT, userId, contactUuid);
    if (!contactId) {
      throw new Error(`Invalid contact_id does not exist. contact_id=${contactUuid}`);
    }
    cacheService.cache(CONTACT_UUID_ID, contactUuid, contactId);
  }
  body.contact_id = contactId;
  return body;
}

module.exports = { dbToApi, apiToDb };
