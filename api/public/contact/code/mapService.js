const dbService = require('./dbService');

const { TABLE } = dbService;

const cacheContact = {};

async function dbToApi(tableName, userId, body) {
  if ([TABLE.ADDRESS].includes(tableName)) {
    const contact_id = Number(body.contact_id);
    let contactUuid = Object.keys(cacheContact).find(key => cacheContact[key] === contact_id);
    if (!contactUuid) {
      contact = await dbService.getById(TABLE.CONTACT, userId, contact_id);
      if (!contact) {
        throw new Error(`Invalid contact_id does not exist. contact_id=${contact_id}`);
      }
      contactUuid = contact.uuid;
      cacheContact[contact.uuid] = contact.id;
    }
    body.contact_id = contactUuid;
  }
  return body;
}

async function apiToDb(tableName, userId, body) {
  if ([TABLE.ADDRESS].includes(tableName)) {
    const { contact_id } = body;
    let contactId = cacheContact[contact_id];
    if (!contactId) {
      contactId = await dbService.getId(TABLE.CONTACT, userId, contact_id);
      if (!contactId) {
        throw new Error(`Invalid contact_id does not exist. contact_id=${contact_id}`);
      }
      cacheContact[contact_id] = contactId;
    }
    body.contact_id = contactId;
  }
  return body;
}

module.exports = { dbToApi, apiToDb };
