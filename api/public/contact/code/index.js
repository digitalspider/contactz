const httpService = require('./httpService');
const routeService = require('./routeService');
const dbService = require('./dbService');
const mapService = require('./mapService');

const RESERVED_TABLE_NAMES = ['group', 'role', 'user'];

exports.handler = async (event, _context) => {
  console.log('==== event ====');
  console.log(event);
  const headers = {
    'Content-Type': 'application/json'
  };
  try {
    const result = await routeService.route(event);
    return httpService.sendResponseOk(result, headers);
  } catch (err) {
    console.log(err);
    return httpService.sendResponseError(err, headers);
  }
}