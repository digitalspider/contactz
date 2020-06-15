// A JWT token-based lambda authorizer used to validate authorization header for an API call.
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');

const UNAUTHORIZED = 'Unauthorized';
const ALLOW = 'Allow';
const DENY = 'Deny';
const EFFECTS = [ALLOW.toLowerCase(), DENY.toLowerCase()];
const BEARER_LC = 'bearer';

AWS.config.update({ region: 'ap-southeast-2' });

const { JWT_SECRET } = process.env;

exports.handler = async function (event, _context, callback) {
  try {
    const authHeaderValue = event.headers && event.headers.authorization || event.headers.Authorization;
    if (!JWT_SECRET) {
      // Handle system errors
      // Return a 500 Environment variables are not set
      callback("Error: Environment variables are not set");
    } else if (authHeaderValue && typeof authHeaderValue === 'string') {  // Check for valid JWT
      const keyValue = authHeaderValue.split(' ');
      if (keyValue[0].toLowerCase() === BEARER_LC && keyValue.length === 2) {
        const jwtToken = keyValue[1].trim();
        const jwtPayload = await verifyToken(jwtToken);
        if (jwtPayload) {
          const principalId = jwtPayload.sub;
          const context = jwtPayload.aud ? { audience: jwtPayload.aud } : undefined;
          callback(null, generateAllow(principalId, event.methodArn, context));
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
  return jwt.verify(token, JWT_SECRET, { algorithm: ['HS256'] });
};

// Help function to generate an IAM policy
const generatePolicy = function (principalId, effect, resource, context) {
  // Required output:
  const authResponse = {};
  if (principalId) {
    authResponse.principalId = principalId;
    if (context) {
      authResponse.context = context;
    }
    if (effect && resource) {
      const policyDocument = {
        Version: '2012-10-17',
        Statement: [{
          Action: 'execute-api:Invoke',
          Effect: EFFECTS.find(e => e === effect.toLowerCase()) ? effect : DENY,
          Resource: resource,
        }],
      };
      authResponse.policyDocument = policyDocument;
    }
  }
  return authResponse;
}

const generateAllow = function (principalId, resource, context) {
  return generatePolicy(principalId, 'Allow', resource, context);
}
