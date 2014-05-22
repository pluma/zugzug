var Promise = require('bluebird');
var redis = require('redis');
var exclude = require('./exclude');

function RedisClient(options) {
  if (!(this instanceof RedisClient)) return new RedisClient(options);
  if (!options) options = {};
  this.client = redis.createClient(
    options.port,
    options.server,
    exclude(options, 'port', 'server')
  );
  this.options = options;
  this.multi = this.client.multi.bind(this.client);
  [
    'brpoplpush',
    'hget',
    'hgetall',
    'hmget',
    'hmset',
    'hset',
    'incr',
    'publish',
    'select'
  ].forEach(function(command) {
    this[command] = Promise.promisify(this.client[command], this.client);
  }.bind(this));
}

RedisClient.prototype.clone = function clone() {
  return new RedisClient(this.options);
};

module.exports = RedisClient;