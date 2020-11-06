const httpService = require('./service/httpService');
const routeService = require('./service/routeService');
const logService = require('./service/logService');

exports.handler = async (event, _context) => {
  logService.info('Request', event);
  const headers = {
    'Content-Type': 'application/json',
  };
  try {
    const result = await routeService.route(event);
    const response = httpService.getResponseOk(result, headers);
    logService.info('Response:', response);
    return response;
  } catch (err) {
    logService.error(err);
    const response = httpService.getResponseError(err, headers);
    logService.error('Response:', response);
    return response;
  }
};
