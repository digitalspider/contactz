const dbService = require('./dbService');

const { TABLE } = dbService;

const cacheContact = {};

function dbToApi(tableName, userId, body) {
  if ([TABLE.ADDRESS].includes(tableName)) {
    const { contact_id } = body;
    let contact_uuid = Object.values(cacheContact).find(v => v === contact_id);
    console.log(contact_uuid);
    if (!contact_uuid) {
      contact = dbService.getById(TABLE.CONTACT, userId, contact_id);
      if (!contact) {
        throw new Error(`Invalid contact_id does not exist. contact_id=${contact_id}`);
      }
      contact_uuid = contact.uuid;
      cacheContact[contact.uuid] = contact.id;
    }
    body.contact_id = contact_uuid;
  }
  return body;
}

function apiToDb(tableName, userId, body) {
  if ([TABLE.ADDRESS].includes(tableName)) {
    const { contact_id } = body;
    let contact = cacheContact[contact_id];
    if (!contact) {
      contact = dbService.get(TABLE.CONTACT, userId, contact_id);
      if (!contact) {
        throw new Error(`Invalid contact_id does not exist. contact_id=${contact_id}`);
      }
      cacheContact[contact_id] = contact.id;
    }
    body.contact_id = contact.id;
  }
  return body;
}

module.exports = { dbToApi, apiToDb };
