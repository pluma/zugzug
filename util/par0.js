var slice = require('./slice');

function par0(fn) {
  var args = slice(arguments, 1);
  return function() {
    return fn.apply(null, args);
  };
}

module.exports = par0;