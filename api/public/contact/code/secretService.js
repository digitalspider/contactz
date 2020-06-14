const AWS = require('aws-sdk');
const AWSXRay = require('aws-xray-sdk');
const constants = require('./constants');
const {
  AWS_REGION_APSE2,
  SECRET_MANAGER_URL,
} = constants;

const client = AWSXRay.captureAWSClient(new AWS.SecretsManager({
  endpoint: SECRET_MANAGER_URL,
  region: AWS_REGION_APSE2,
  apiVersion: 'latest'
}));

const cache = {};

/**
 * Retrieve data from the SecretsManager.
 * @param {string} secretName the name of the secret
 * @param {boolean} isJson if true do a JSON.parse() on the results. Default=true
 */
async function getSecret(secretName, isJson = true) {
  if (cache[secretName]) {
    return cache[secretName];
  }
  const secret = await client.getSecretValue({ SecretId: secretName }).promise();
  let secretString;
  // Decode based on the secret type
  if ('SecretString' in secret) {
    secretString = secret.SecretString;
  } else if ('SecretBinary' in secret) {
    secretString = Buffer.from(secret.SecretBinary, 'base64').toString('ascii');
  } else {
    throw `The secret '${secretName}' is malformed.`;
  }
  const result = isJson ? JSON.parse(secretString) : secretString;
  cache[secretName] = result;
  return result;
}

module.exports = { getSecret };
