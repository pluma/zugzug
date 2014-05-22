var slice = require('./slice');

function par1(fn) {
  var args = slice(arguments, 1);
  return function(arg) {
    return fn.apply(null, args.concat(arg));
  };
}

module.exports = par1;