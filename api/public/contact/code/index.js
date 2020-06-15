const httpService = require('./httpService');
const userService = require('./userService');
const dbService = require('./dbService');

const RESERVED_TABLE_NAMES = ['group', 'role', 'user'];

exports.handler = async (event, _context) => {
  console.log('==== event ====');
  console.log(event);
  const headers = {
    'Content-Type': 'application/json'
  };
  try {
    const method = event.httpMethod;
    const pathParts = event.path ? event.path.split('/') : null;
    const pathContext = pathParts.length > 1 ? pathParts[1] : null;
    console.log(`pathContext=${pathContext}`);
    if (!pathContext) {
      return httpService.sendResponseOk({ intro: 'welcome' }, headers);
    }
    if (!['user', 'contact', 'account', 'address', 'tag', 'group'].includes(pathContext)) {
      throw new Error(`Invalid request. Path is invalid. path=${event.path}`);
    }
    const tableName = RESERVED_TABLE_NAMES.includes(pathContext) ? pathContext + 's' : pathContext;
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : undefined;
    let result;

    if (pathContext === 'user') {
      if (method !== 'POST') {
        throw new Error(`Invalid request method: ${method}`);
      }
      const userAction = pathParts.length > 2 ? pathParts[2] : null;
      if (!userAction) {
        throw new Error('Invalid request, no user action provided');
      }
      switch (userAction) {
        case 'register':
          result = await userService.register(body);
          break;
        case 'login':
          result = await userService.login(body);
          break;
        default:
          throw new Error(`Invalid request. Unknown userAction: ${userAction}`);
      }
      return httpService.sendResponseOk(result, headers);
    }

    const userUuid = event.requestContext.authorizer.principalId;
    const user = await userService.getUserByUuid(userUuid);
    if (!user) {
      throw new Error('Authorization failed. No user available in request');
    }
    const userId = user.id;
    console.log(`userId=${userId}`);
    const id = event.pathParameters ? event.pathParameters.id : null;
    console.log(`id=${id}`);
    switch (method) {
      case 'GET':
        if (!id) {
          const searchTerm = event.pathParameters ? event.pathParameters.q : null;
          result = await dbService.list(tableName, userId, searchTerm);
        } else {
          result = await dbService.get(tableName, userId, id);
        }
        break;
      case 'POST':
        result = await dbService.create(tableName, userId, body);
        break;
      case 'PUT':
        if (!id) {
          throw new Error('Invalid request, no ID provided');
        }
        result = await dbService.update(tableName, userId, id, body);
        break;
      case 'DELETE':
        if (!id) {
          throw new Error('Invalid request, no ID provided');
        }
        result = await dbService.softDelete(tableName, userId, id);
        break;
      default:
        throw new Error(`Invalid request method: ${method}`);
    }
    return httpService.sendResponseOk(result, headers);
  } catch (err) {
    console.log(err);
    return httpService.sendResponseError(err, headers);
  }
}