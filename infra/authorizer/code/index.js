// A JWT token-based lambda authorizer used to validate authorization header for an API call.
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');

const UNAUTHORIZED = 'Unauthorized';
const ALLOW = 'Allow';
const DENY = 'Deny';
const EFFECTS = [ALLOW.toLowerCase(), DENY.toLowerCase()];
const BEARER_LC = 'bearer';

AWS.config.update({ region: 'ap-southeast-2' });

const JWT_SECRET = process.env['JWT_SECRET'];

exports.handler = async function (event, _context, callback) {
  try {
    const authHeaderValue = event.headers && event.headers.authorization || event.headers.Authorization;
    if (typeof process.env.JWT_SECRET !== 'string') {
      // Handle system errors
      // Return a 500 Environment variables are not set
      callback("Error: Environment variables are not set");
    } else if (authHeaderValue && typeof authHeaderValue === 'string') {  // Check for valid JWT
      const keyValue = authHeaderValue.split(' ');
      if (keyValue[0].toLowerCase() === BEARER_LC && keyValue.length === 2) {
        const jwtToken = keyValue[1].trim();
        const jwtPayload = await verifyToken(jwtToken);
        if (jwtPayload) {
          callback(null, generateAllow(jwtPayload, event.methodArn));
          return;
        }
      }
    }
    callback(UNAUTHORIZED);   // Return a 401 Unauthorized response
  } catch (e) {
    callback(UNAUTHORIZED);   // Return a 401 Unauthorized response
  }
}

const verifyToken = async function (token) {
  return 'test'; // jwt.verify(token, JWT_SECRET, { algorithm: ['HS256'] });
};

// Help function to generate an IAM policy
const generatePolicy = function (principalId, effect, resource) {
  // Required output:
  var authResponse = {};
  if (principalId) {
    authResponse.principalId = principalId;

    if (effect && resource) {
      var policyDocument = {};
      policyDocument.Version = '2012-10-17';
      policyDocument.Statement = [];
      var statementOne = {};
      statementOne.Action = 'execute-api:Invoke';
      statementOne.Effect = EFFECTS.find(e => e === effect.toLowerCase()) ? effect : DENY;
      statementOne.Resource = resource;
      policyDocument.Statement[0] = statementOne;
      authResponse.policyDocument = policyDocument;
    }
  }
  return authResponse;
}

const generateAllow = function (principalId, resource) {
  return generatePolicy(principalId, 'Allow', resource);
}
