const httpService = require('./httpService');
const routeService = require('./routeService');
const logService = require('./logService');

exports.handler = async (event, _context) => {
  logService.info('==== event ====', event);
  const headers = {
    'Content-Type': 'application/json'
  };
  try {
    const result = await routeService.route(event);
    return httpService.sendResponseOk(result, headers);
  } catch (err) {
    logService.error(err);
    return httpService.sendResponseError(err, headers);
  }
}