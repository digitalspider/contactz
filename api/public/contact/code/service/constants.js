module.exports = Object.freeze({
  AWS_REGION_APSE2: 'ap-southeast-2',
  SECRET_MANAGER_URL: 'secretsmanager.ap-southeast-2.amazonaws.com',
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    PRECONDITION_FAILED: 412,
    INTERNAL_SERVER_ERROR: 500,
  },
  HEADERS: {
    X_AMZN_TRACE_ID: 'X-Amzn-Trace-Id',
    CONTENT_TYPE: 'Content-Type',
    ACCEPT: 'Accept',
    AUTHORIZATION: 'Authorization',
  },
  CONTENT_TYPE_APP_JSON: 'application/json',
});
