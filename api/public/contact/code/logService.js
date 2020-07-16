const { DEBUG, DEBUG_SQL } = process.env;

function info(...messages) {
  console.log('INFO: ' + createPrintString(messages));
}

function warn(...messages) {
  console.warn('WARN: ' + createPrintString(messages));
}

function error(...messages) {
  console.error('ERROR: ' + createPrintString(messages));
}

function debug(...messages) {
  if (DEBUG) {
    console.log('DEBUG: ' + createPrintString(messages));
  }
}

function debugSql(...messages) {
  if (DEBUG_SQL) {
    console.log('SQL: ' + createPrintString(messages));
  }
}

function createPrintString(messages) {
  return messages.map((message) => typeof message === 'object' ? message.message || JSON.stringify(message) : message).join(' ');
}

module.exports = { info, warn, error, debug, debugSql };