const utils = require('./utils');
const dbService = require('./dbService');

exports.handler = async (event, _context) => {
  console.log('==== event ====');
  console.log(event);
  const headers = {
    'Content-Type': 'application/json'
  };
  try {
    const userId = event.requestContext.authorizer.principalId;
    console.log(`userId=${userId}`);
    if (!userId) {
      throw new Error('Authorization failed. No user available in request');
    }
    const method = event.httpMethod;
    const id = event.pathParameters ? event.pathParameters.id : null;
    console.log(`id=${id}`);
    let result;

    switch(method) {
      case 'GET':
        if (!id) {
          result = await dbService.list(userId);
        } else {
          result = await dbService.get(userId, id);
        }
        break;
      case 'POST':
        result = await dbService.create(userId, event.body);
        break;
      case 'PUT':
        if (!id) {
          throw new Error('Invalid request, no ID provided');
        }
        result = await dbService.update(userId, id, event.body);
        break;
      case 'DELETE':
        if (!id) {
          throw new Error('Invalid request, no ID provided');
        }
        result = await dbService.softDelete(userId, id);
        break;
      default:
        throw new Error(`Invalid request method: ${httpMethod}`);
    }
    return utils.sendResponseOk(result, headers);
  } catch (err) {
    console.log(err);
    return utils.sendResponseError(err, headers);
  }
}