const userService = require('./userService');
const authService = require('./authService');
const httpService = require('./httpService');
const dbService = require('./dbService');
const dynamoService = require('./dynamoService');
const mapService = require('./mapService');
const logService = require('./logService');
const constants = require('./constants');
const utilService = require('./utilService');

const TABLE_NAMES = {
  contact: 'contact'
};

const METHOD = {
  POST: 'POST',
  GET: 'GET',
  PUT: 'PUT',
  DELETE: 'DELETE',
};
const { HTTP_STATUS } = constants;
const { NotFoundError, BadRequestError } = httpService;

async function route(req, res, next) {
  const { baseUrl: path } = req;
  const pathParts = path ? path.split('/') : null;
  const pathContext = pathParts && pathParts.length > 1 ? pathParts[1] : null;
  logService.info('pathContext', pathContext);
  if (!pathContext) {
    return { success: true };
  }
  switch (pathContext) {
    case 'status':
      return { success: true };
    case 'user':
      return routeUser(req);
    case 'type':
      return routeType(req);
    case 'contact':
      return crudFunction(req, res);
    default:
      throw new NotFoundError(`Invalid request. Path is invalid. path=${path}`);
  }
}

async function routeUser(req) {
  const { baseUrl: path, method, body: bodyValue } = req;
  const pathParts = path ? path.split('/') : null;
  const body = typeof bodyValue === 'string' ? JSON.parse(bodyValue) : bodyValue;
  if (method !== METHOD.POST) {
    throw new BadRequestError(`Invalid request method: ${method}`, HTTP_STATUS.METHOD_NOT_ALLOWED);
  }
  const userAction = pathParts && pathParts.length > 2 ? pathParts[2] : null;
  if (!userAction) {
    throw new NotFoundError('Invalid request, no user action provided');
  }
  switch (userAction) {
    case 'register':
      return userService.register(body);
    case 'login':
      return userService.login(body);
    case 'logout':
      const userUuid = req.user;
      return userService.logout(userUuid);
    case 'refresh':
      return userService.refreshToken(req.headers);
    default:
      throw new NotFoundError(`Invalid request. Unknown userAction: ${userAction}`);
  }
}

async function routeType(req) {
  const { baseUrl: path, method } = req;
  const pathParts = path ? path.split('/') : null;
  if (method !== METHOD.GET) {
    throw new BadRequestError(`Invalid request method: ${method}`, HTTP_STATUS.METHOD_NOT_ALLOWED);
  }
  const typeName = pathParts && pathParts.length > 2 ? pathParts[2] : null;
  const types = await dbService.getTypes();
  let results = {};
  types.forEach((type) => {
    if (!results[type.name]) {
      results[type.name] = [];
    }
    results[type.name].push(type.value);
  });
  if (typeName) {
    results = results[typeName];
  }
  return results;
}

async function crudFunction(req, res) {
  const { baseUrl: path, method, body: bodyValue } = req;
  const pathParts = path ? path.split('/') : null;
  const body = typeof bodyValue === 'string' ? JSON.parse(bodyValue) : bodyValue;
  const pathContext = pathParts && pathParts.length > 1 ? pathParts[1] : null;
  const tableName = TABLE_NAMES[pathContext];
  let result;

  const auth = await authService.authenticate(req, res);
  console.log('auth');
  console.log(auth);
  const userUuid = auth && auth.user;
  const user = await userService.getUserByUuid(userUuid);
  if (!user) {
    throw new BadRequestError('Authorization failed. No user available in request', HTTP_STATUS.UNAUTHORIZED);
  }
  const userId = user.id;
  const { id } = req.params;
  logService.debug(`userId=${userId}. id=${id}`);
  switch (method) {
    case METHOD.GET:
      if (!id) {
        let limit;
        let pageNo;
        let searchOptions;
        if (req.query) {
          const { q, qc, qe, sort, sortOrder, page, pageSize } = req.query;
          limit = !isNaN(pageSize) ? Number(pageSize) : undefined;
          pageNo = !isNaN(page) ? Number(page) : undefined;
          searchOptions = {
            searchTerm: q,
            searchColumn: qc,
            searchExact: qe || false, // false if q is defined
            sortColumn: sort,
            sortOrder,
          };
        }
        result = await dbService.list(tableName, userId, limit, pageNo, searchOptions);
        if (result.results) {
          result.results.map((data) => mapService.dbToApi(tableName, userId, null, data));
          result.results.map((data) => {
            delete data.id;
            return data;
          });
        }
      } else {
        result = await dynamoService.crud.readOne({ tableName, partitionKey: id, sortKey: userId });
        await mapService.dbToApi(tableName, userId, id, result);
        delete result.id;
      }
      break;
    case METHOD.POST:
      // await mapService.apiToDb(tableName, userId, null, body);
      id = utilService.generateId('C-');
      result = await dynamoService.crud.create({ tableName, partitionKey: id, sortKey: userId, body });
      await mapService.apiToDbPost(tableName, userId, body, result.uuid || result.name);
      delete result.id;
      break;
    case METHOD.PUT:
      if (!id) {
        throw new BadR('Invalid PUT request, no ID provided');
      }
      // await mapService.apiToDb(tableName, userId, id, body);
      result = await dynamoService.crud.update({ tableName, partitionKey: id, sortKey: userId, body });
      delete result.id;
      break;
    case METHOD.DELETE:
      if (!id) {
        throw new Error('Invalid DELETE request, no ID provided');
      }
      result = await dynamoService.crud.delete({ tableName, partitionKey: id, sortKey: userId });
      break;
    default:
      throw new Error(`Invalid request method: ${method}. Expected GET, POST, PUT or DELETE`);
  }
  return result;
}

module.exports = { route };
