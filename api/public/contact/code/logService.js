const { DEBUG, DEBUG_SQL } = process.env;

function info(...messages) {
  console.log(createPrintString(messages));
}

function warn(...messages) {
  console.warn(createPrintString(messages));
}

function error(...messages) {
  console.error(createPrintString(messages));
}

function debug(...messages) {
  if (DEBUG) {
    console.log(createPrintString(messages));
  }
}

function debugSql(...messages) {
  if (DEBUG_SQL) {
    console.log(createPrintString(['SQL: ', messages]));
  }
}

function createPrintString(messages) {
  return messages.map((message) => typeof message === 'object' ? JSON.stringify(message) : message).join(' ');
}

module.exports = { info, warn, error, debug, debugSql };