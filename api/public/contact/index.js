const httpService = require('./code/httpService');
const routeService = require('./code/routeService');
const logService = require('./code/logService');
const express = require('express');

const app = express();
app.use('*', route);
app.listen(8000);

async function route(req, res, next) {
  const { method, protocol, baseUrl: path, params, query, headers, body } = req;
  const { host, ['user-agent']: userAgent } = headers;
  logService.info('==== req ====', method, protocol, host, path, params, query, userAgent.replace(/\s/g, '|'), body);
  const responseHeaders = {
    'Content-Type': 'application/json'
  };
  try {
    const result = await routeService.route(req);
    const response = httpService.getResponseOk(result, responseHeaders);
    return res.status(response.statusCode).set(responseHeaders).send(response.body);
  } catch (err) {
    logService.error(err);
    const response = httpService.getResponseError(err, responseHeaders);
    return res.status(response.statusCode).set(responseHeaders).send(response.body);
  }
}