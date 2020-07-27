// A JWT token-based lambda authorizer used to validate authorization header for an API call.
const jwt = require('jsonwebtoken');
const constants = require('./constants');
const httpService = require('./httpService');
const { HTTP_STATUS } = constants;

const UNAUTHORIZED = 'Unauthorized';
const BEARER = 'bearer';

const { JWT_SECRET } = process.env;

function getToken(headers) {
  const authHeaderValue = headers && headers.authorization || headers.Authorization;
  if (authHeaderValue && typeof authHeaderValue === 'string') {
    const keyValue = authHeaderValue.split(' ');
    if (keyValue[0].toLowerCase() === BEARER && keyValue.length === 2) {
      return keyValue[1].trim();
    }
  }
}

async function authenticate(req, res, next) {
  try {
    if (!JWT_SECRET) {
      throw new Error("Error: Environment variables are not set");
    }
    const jwtToken = getToken(req.headers);
    if (!jwtToken) {
      throw new Error('Invalid request. Missing jwtToken');
    }
    const jwtPayload = await jwt.verify(jwtToken, JWT_SECRET, { algorithm: ['HS256'] });
    if (!jwtPayload) {
      throw new Error('Could not validate jwtToken. Content is empty');
    }
    const principalId = jwtPayload.sub;
    const context = {
      aud: jwtPayload.aud,
      role: jwtPayload.role,
      domain: jwtPayload.domain,
    };
    res.local.user = principalId;
    res.local.context = context;
    return next ? next() : {
      user: principalId,
      context,
    }
  } catch (e) {
    const headers = {
      'Content-Type': 'application/json',
    };
    const body = {
      message: UNAUTHORIZED,
      timestamp: new Date().toISOString(),
      details: e.message,
    }
    httpService.getResponse(HTTP_STATUS.UNAUTHORIZED, body, headers);   // Return a 401 Unauthorized response
  }
}

module.exports = { authenticate }