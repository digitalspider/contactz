const moment = require('moment');
const constants = require('./constants');
const httpStatus = constants.HTTP_STATUS;

class NotFoundError extends Error {
  constructor(message, { errorCode, details } = {}) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = httpStatus.NOT_FOUND;
    if (details) {
      this.details = details;
    }
    if (errorCode) {
      this.code = errorCode;
    }
    Error.captureStackTrace(this, NotFoundError);
  }
}

class BadRequestError extends Error {
  constructor(message, statusCode, { errorCode, details } = {}) {
    super(message);
    this.name = 'BadRequestError';
    this.statusCode = Number.isInteger(statusCode) ? statusCode : httpStatus.BAD_REQUEST;
    if (details) {
      this.details = details;
    }
    if (errorCode) {
      this.code = errorCode;
    }
    Error.captureStackTrace(this, BadRequestError);
  }
}

function sendResponseOk(body = {}, headers = {}, isBase64Encoded) {
  return sendResponse(httpStatus.OK, body, headers, isBase64Encoded);
}

function sendResponseError(err, headers = {}) {
  const errorBody = {
    message: err.message || '',
    code: err.code || undefined,
    details: err.details || undefined,
    timestamp: err.timestamp || moment().format(moment.HTML5_FMT.DATETIME_LOCAL_MS),
  };
  const statusCode = err.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
  return sendResponse(statusCode, errorBody, headers);
}

/**
 * The output from a Lambda proxy integration must be in the following JSON object.
 * For base64-encoded payload, you must also set the 'isBase64Encoded' property to 'true'.
 *
 * @param {number} statusCode the status code to send
 * @param {object} body the content to send. This should be an object, as this function calls JSON.stringify(body)
 * @param {object} headers any additional headers to add
 * @param {boolean} isBase64Encoded set if payload is encoded, default=false
 */
function sendResponse(statusCode, body = {}, headers = {}, isBase64Encoded = false) {
  // For exports and images
  if (['application/pdf','text/csv'].includes(headers['Accept'])) {
    headers['Content-Type'] = headers['Accept'];
    body = body.toString('base64');
    isBase64Encoded = true;
  }
  else {
    body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const response = {
    statusCode,
    headers,
    body,
    isBase64Encoded
  };
  
  console.log("response: " + JSON.stringify(response));
  return response;
}

module.exports = {sendResponse, sendResponseOk, sendResponseError, NotFoundError, BadRequestError};
