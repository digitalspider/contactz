const dbService = require('./dbService');
const cacheService = require('./cacheService');

const { TABLE } = dbService;
const { CONTACT_UUID_ID } = cacheService.CONTEXT;

async function dbToApi(tableName, userId, body) {
  switch (tableName) {
    case TABLE.ADDRESS:
      return dbToApiAddress(userId, body);
    case TABLE.CONTACT:
      return dbToApiContact(userId, body);
  }
}

async function apiToDb(tableName, userId, body) {
  switch (tableName) {
    case TABLE.ADDRESS:
      return apiToDbAddress(userId, body);
    case TABLE.CONTACT:
      return apiToDbContact(userId, body);
  }
  return body;
}

async function apiToDbPost(tableName, userId, body, uuid) {
  switch (tableName) {
    case TABLE.CONTACT:
      return apiToDbPostContact(userId, body, uuid);
  }
  return body;
}

async function dbToApiAddress(userId, body) {
  const contact_id = Number(body.contact_id);
  let contactUuid = cacheService.getKeyByValue(CONTACT_UUID_ID, contact_id);
  if (!contactUuid) {
    const contact = await dbService.getById(TABLE.CONTACT, userId, contact_id);
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

async function dbToApiContact(userId, body) {
  const contacts = await dbService.list(TABLE.ADDRESS, userId, 'contact_id', userId);
  // TODO: Wont show more than 20 addresses?
  body.addresses = contacts.results;
  return body;
}

async function apiToDbContact(userId, body) {
  delete body.addresses;
  return body;
}

async function apiToDbPostContact(userId, body, uuid) {
  if (body.addresses) {
    const promises = []
    const contactId = await dbService.getId(TABLE.CONTACT, userId, uuid);
    body.addresses.map((address) => {
      address.contact_id = contactId;
      if (address.uuid) {
        promises.push(dbService.update(TABLE.ADDRESS, userId, address.uuid, address));
      } else {
        promises.push(dbService.create(TABLE.ADDRESS, userId, address));
      }
    });
    await Promise.all(promises);
  }
}

module.exports = { dbToApi, apiToDb, apiToDbPost };
