var slice = require('./slice');

function exclude(obj) {
  var ignore = slice(arguments, 1);
  var res = {};
  Object.keys(obj).forEach(function(key) {
    if (key in ignore) return;
    res[key] = obj[key];
  });
  return obj;
}

module.exports = exclude;