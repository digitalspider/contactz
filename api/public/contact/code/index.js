const httpService = require('./service/httpService');
const routeService = require('./service/routeService');
const logService = require('./service/logService');

exports.handler = async (event, _context) => {
  logService.info('==== event ====', event);
  const headers = {
    'Content-Type': 'application/json',
  };
  try {
    const result = await routeService.route(event);
    return httpService.sendResponseOk(result, headers);
  } catch (err) {
    logService.error(err);
    return httpService.sendResponseError(err, headers);
  }
};
