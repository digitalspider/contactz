const { DEBUG } = process.env;

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

function createPrintString(messages) {
  return messages.map((message) => typeof message === 'string' ? message : JSON.stringify(message)).join(' ');
}

module.exports = { info, warn, error, debug };