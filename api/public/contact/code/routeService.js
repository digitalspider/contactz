const userService = require('./userService');
const dbService = require('./dbService');
const mapService = require('./mapService');

const RESERVED_TABLE_NAMES = ['group', 'role', 'user'];
const METHOD = {
  POST: 'POST',
  GET: 'GET',
  PUT: 'PUT',
  DELETE: 'DELETE',
}

async function route(event) {
  const pathParts = event.path ? event.path.split('/') : null;
  const pathContext = pathParts.length > 1 ? pathParts[1] : null;
  console.log(`pathContext=${pathContext}`);
  if (!pathContext) {
    return { success: true };
  }
  switch (pathContext) {
    case 'ping':
      return { success: true };
    case 'user':
      return routeUser(event);
    case 'contact', 'org', 'address', 'tag', 'group':
      return crudFunction(event);
    default:
      throw new Error(`Invalid request. Path is invalid. path=${event.path}`);
  }
}

async function routeUser(event) {
  const method = event.httpMethod;
  const pathParts = event.path ? event.path.split('/') : null;
  const body = typeof event.body === 'string' ? JSON.parse(event.body) : undefined;
  if (method !== METHOD.POST) {
    throw new Error(`Invalid request method: ${method}`);
  }
  const userAction = pathParts.length > 2 ? pathParts[2] : null;
  if (!userAction) {
    throw new Error('Invalid request, no user action provided');
  }
  switch (userAction) {
    case 'register':
      return userService.register(body);
    case 'login':
      return userService.login(body);
    default:
      throw new Error(`Invalid request. Unknown userAction: ${userAction}`);
  }
}

async function crudFunction(event) {
  const method = event.httpMethod;
  const pathParts = event.path ? event.path.split('/') : null;
  const pathContext = pathParts.length > 1 ? pathParts[1] : null;
  const tableName = RESERVED_TABLE_NAMES.includes(pathContext) ? pathContext + 's' : pathContext;
  const body = typeof event.body === 'string' ? JSON.parse(event.body) : undefined;
  let result;

  const userUuid = event.requestContext.authorizer.principalId;
  const user = await userService.getUserByUuid(userUuid);
  if (!user) {
    throw new Error('Authorization failed. No user available in request');
  }
  const userId = user.id;
  const id = event.pathParameters ? event.pathParameters.id : null;
  console.log(`userId=${userId}. id=${id}`);
  switch (method) {
    case METHOD.GET:
      if (!id) {
        let searchTerm;
        let limit;
        let pageNo;
        if (event.queryStringParameters) {
          const { q, page, pageSize } = event.queryStringParameters;
          searchTerm = q || undefined;
          limit = !isNaN(pageSize) ? Number(pageSize) : undefined;
          pageNo = !isNaN(page) ? Number(page) : undefined;
        }
        result = await dbService.list(tableName, userId, searchTerm, limit, pageNo);
        result.results && result.results.map(data => mapService.dbToApi(tableName, userId, data));
      } else {
        result = await dbService.get(tableName, userId, id);
        await mapService.dbToApi(tableName, userId, result);
      }
      break;
    case METHOD.POST:
      await mapService.apiToDb(tableName, userId, body);
      result = await dbService.create(tableName, userId, body);
      break;
    case METHOD.PUT:
      if (!id) {
        throw new Error('Invalid request, no ID provided');
      }
      await mapService.apiToDb(tableName, userId, body);
      result = await dbService.update(tableName, userId, id, body);
      break;
    case METHOD.DELETE:
      if (!id) {
        throw new Error('Invalid request, no ID provided');
      }
      result = await dbService.softDelete(tableName, userId, id);
      break;
    default:
      throw new Error(`Invalid request method: ${method}`);
  }
  return result;
}

module.exports = { route };