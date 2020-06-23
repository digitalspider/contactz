const _cache = {};

const CONTEXT = {
  TYPES: 'types',
  TABLE_COLUMN_DATA: 'table-column-data',
};

function init(context) {
  if (!_cache[context]) {
    _cache[context] = {};
  }
}

function cache(context, key, value) {
  init(context);
  return _cache[context][key] = value;
}

function invalidate(context, key) {
  if (key) {
    init(context);
    _cache[context][key] = undefined;
  } else {
    _cache[context] = {}
  }
}

function fromCache(context, key) {
  init(context);
  return _cache[context][key];
}

function getKeyByValue(context, value) {
  init(context);
  return Object.keys(_cache[context]).find(key => _cache[context][key] === value);
}

module.exports = { CONTEXT, cache, fromCache, getKeyByValue, invalidate };
