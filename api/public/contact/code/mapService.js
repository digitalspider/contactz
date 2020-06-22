const dbService = require('./dbService');

const { TABLE } = dbService;

async function dbToApi(tableName, userId, uuid, body) {
  await convertToApiId(userId, body, 'contact_id', TABLE.CONTACT);
  await convertToApiId(userId, body, 'address_id', TABLE.ADDRESS);
  switch (tableName) {
    case TABLE.CONTACT:
      return dbToApiContact(userId, uuid, body);
  }
  return body;
}

async function apiToDb(_tableName, userId, _uuid, body) {
  await convertToDbId(userId, body, 'contact_id', TABLE.CONTACT);
  await convertToDbId(userId, body, 'address_id', TABLE.ADDRESS);
  return body;
}

async function apiToDbPost(tableName, userId, id, body, uuid) {
  switch (tableName) {
    case TABLE.CONTACT:
      return apiToDbPostContact(userId, body, id, uuid);
  }
  return body;
}

async function convertToDbId(userId, body, fieldName, tableName) {
  const uuid = body[fieldName];
  if (uuid) {
    const id = await dbService.getId(tableName, userId, uuid);
    if (!id) {
      throw new Error(`Invalid ${fieldName} does not exist. ${fieldName}=${uuid}`);
    }
    body[fieldName] = id;
    return id;
  }
}

async function convertToApiId(userId, body, fieldName, tableName) {
  const id = body[fieldName];
  if (id) {
    const uuid = await dbService.getUuidById(tableName, userId, id);
    if (!uuid) {
      throw new Error(`Invalid ${fieldName} does not exist. ${fieldName}=${id}`);
    }
    body[fieldName] = uuid;
    return uuid;
  }
}

async function dbToApiContact(userId, uuid, body) {
  const contactId = uuid ? await dbService.getId(TABLE.CONTACT, userId, uuid) : body.contact_id;
  if (contactId) {
    const contacts = await dbService.list(TABLE.ADDRESS, userId, 'contact_id', contactId);
    // TODO: Wont show more than 20 addresses?
    body.addresses = contacts.results;
  }
  return body;
}

async function apiToDbPostContact(userId, id, body, uuid) {
  if (body.addresses) {
    const contactId = await dbService.getId(TABLE.CONTACT, userId, id || uuid);
    if (contactId) {
      const promises = [];
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
}

module.exports = { dbToApi, apiToDb, apiToDbPost };
