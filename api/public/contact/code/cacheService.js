const cache = {};

const CONTEXT = {
  CONTACT_UUID_ID: 'contact-uuid-id',
  ADDRESS_UUID_ID: 'address-uuid-id',
};

function init(context) {
  if (!cache[context]) {
    cache[context] = {};
  }
}

function cache(context, key, value) {
  init(context);
  return cache[context][key] = value;
}

function invalidate(context, key) {
  if (key) {
    init(context);
    cache[context][key] = undefined;
  } else {
    cache[context] = {}
  }
}

function fromCache(context, key) {
  init(context);
  return cache[context][key];
}

function getKeyByValue(context, value) {
  init(context);
  return Object.keys(cache[context]).find(key => cache[context][key] === value);
}

module.exports = { CONTEXT, cache, fromCache, getKeyByValue, invalidate };
