function exclude(obj) {
  var ignore = Array.prototype.slice.call(arguments, 1);
  var res = {};
  Object.keys(obj).forEach(function(key) {
    if (~ignore.indexOf(key)) return;
    res[key] = obj[key];
  });
  return res;
}

module.exports = exclude;