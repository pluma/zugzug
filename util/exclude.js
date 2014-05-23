var slice = require('./slice');

function exclude(obj) {
  var ignore = slice(arguments, 1);
  var res = {};
  Object.keys(obj).forEach(function(key) {
    if (~ignore.indexOf(key)) return;
    res[key] = obj[key];
  });
  return res;
}

module.exports = exclude;