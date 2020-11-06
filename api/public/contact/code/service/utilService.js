const uuid = require('uuid').v4;

/**
 * Generate a unique ID, using uuid.v4, without the dashes.
 * e.g. prefix=C- will generate C-a1b2c3...
 *
 * @param {string} prefix a prefix which with to prepend the ID, defaults to ''
 */
function generateId(prefix = '') {
  return `${prefix}${uuid().replace(/-/g, '')}`;
}

/**
 * Trim all the string values from the given data
 * @param {object} data process recursively
 * @param {boolean} processRecursively if true, process recursively. Default=true
 */
function trimAllStringValues(data, processRecursively = true) {
  if (!data) {
    return data;
  }
  Object.keys(data).forEach((key) => {
    if (typeof data[key] === 'string') {
      data[key] = data[key].trim();
    } else if (processRecursively && typeof data[key] === 'object') {
      trimAllStringValues(data[key]);
    }
  });
  return data;
}

module.exports = { generateId, trimAllStringValues };
