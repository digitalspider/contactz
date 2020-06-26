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

async function apiToDb(tableName, userId, uuid, body) {
  await convertToDbId(userId, body, 'contact_id', TABLE.CONTACT);
  await convertToDbId(userId, body, 'address_id', TABLE.ADDRESS);
  switch (tableName) {
    case TABLE.CONTACT:
      return apiToDbContact(userId, body, uuid);
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
    const searchOptions = {
      searchColumn: 'contact_id',
      searchTerm: contactId,
      searchExact: true,
    }
    const pageSize = null; // Bypass pagination
    const addresses = (await dbService.list(TABLE.ADDRESS, userId, pageSize, 0, searchOptions)).results;
    body.addresses = addresses.map((address) => { delete address.id; return address; });
    body.tags = await convertIdsToNames(TABLE.TAG, userId, body.tags);
    body.groups = await convertIdsToNames(TABLE.GROUPS, userId, body.groups);
  }
  return body;
}

async function apiToDbContact(userId, body, _uuid) {
  body.tags = await covertNamesToIds(TABLE.TAG, userId, body.tags);
  body.groups = await covertNamesToIds(TABLE.GROUPS, userId, body.groups);
  return body;
}

async function apiToDbPostContact(userId, body, uuid) {
  if (body.addresses) {
    const contactId = await dbService.getId(TABLE.CONTACT, userId, uuid);
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

async function covertNamesToIds(tableName, userId, nameList) {
  if (!nameList) {
    return nameList;
  }
  const pageSize = null; // Bypass pagination
  const dbData = (await dbService.list(tableName, userId, pageSize)).results;
  const newValues = [];
  const idList = nameList.map((name) => {
    const dbObject = dbData.find((dbRow) => dbRow.name === name);
    if (dbObject) {
      return dbObject.id;
    } else {
      newValues.push(name);
    }
  }).filter((id) => id);
  const promises = newValues.map(async (newName) => {
    const insertResult = await dbService.create(tableName, userId, newName);
    if (insertResult) {
      idList.push(insertResult.id);
    }
  });
  await Promise.allSettled(promises);
  return idList;
}

async function convertIdsToNames(tableName, userId, idList) {
  if (!idList) {
    return idList;
  }
  const pageSize = null; // Bypass pagination
  const dbData = (await dbService.list(tableName, userId, pageSize)).results;
  return idList.map((id) => {
    const found = dbData.find((dbItem) => dbItem.id === id);
    return found && found.name;
  }).filter((id) => id);
}

module.exports = { dbToApi, apiToDb, apiToDbPost };
