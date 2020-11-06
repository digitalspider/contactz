const userService = require('./userService');
const authService = require('./authService');
const httpService = require('./httpService');
const crudService = require('./crudService');
const mapService = require('./mapService');
const logService = require('./logService');
const constants = require('./constants');
const utilService = require('./utilService');

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
    throw new BadRequestError(`Invalid request method: ${method}. Expected POST`, HTTP_STATUS.METHOD_NOT_ALLOWED);
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
    throw new BadRequestError(`Invalid request method: ${method}. Expected GET`, HTTP_STATUS.METHOD_NOT_ALLOWED);
  }
  return crudService.crud.types();
}

function getTableName(tableName) {
  if (!crudService.VALID_TABLE_NAMES[tableName]) {
    throw new BadRequestError(`Invalid path context provided: ${tableName}. Expected one of ${VALID_TABLE_NAMES}`);
  }
  return tableName;
}

async function crudFunction(req, res) {
  const { baseUrl: path, method, body: bodyValue } = req;
  const pathParts = path ? path.split('/') : null;
  const body = typeof bodyValue === 'string' ? JSON.parse(bodyValue) : bodyValue;
  const pathContext = pathParts && pathParts.length > 1 ? pathParts[1] : null;
  const tableName = getTableName(pathContext);
  let result;

  const auth = await authService.authenticate(req, res);
  console.log('auth');
  console.log(auth);
  const username = auth && auth.user;
  const user = await userService.getUserByUsername(username);
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
            limit,
            pageNo,
          };
        }
        result = await crudService.crud.search({ tableName, partitionKey: userId, searchOptions });
        // if (result.results) {
        //   result.results.map((data) => mapService.dbToApi(tableName, userId, null, data));
        // }
      } else {
        result = await crudService.crud.read({ tableName, partitionKey: userId, sortKey: id });
        // await mapService.dbToApi(tableName, userId, id, result);
      }
      break;
    case METHOD.POST:
      // await mapService.apiToDb(tableName, userId, null, body);
      id = utilService.generateId('C-');
      result = await crudService.crud.create({ tableName, partitionKey: userId, sortKey: id, body });
      // await mapService.apiToDbPost(tableName, userId, body, result.uuid || result.name);
      break;
    case METHOD.PUT:
      if (!id) {
        throw new BadR('Invalid PUT request, no ID provided');
      }
      // await mapService.apiToDb(tableName, userId, id, body);
      result = await crudService.crud.update({ tableName, partitionKey: userId, sortKey: id, body });
      break;
    case METHOD.DELETE:
      if (!id) {
        throw new Error('Invalid DELETE request, no ID provided');
      }
      result = await crudService.crud.delete({ tableName, partitionKey: userId, sortKey: id });
      break;
    default:
      throw new Error(`Invalid request method: ${method}. Expected GET, POST, PUT or DELETE`);
  }
  return result;
}

module.exports = { route };
