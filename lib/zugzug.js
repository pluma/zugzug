var Promise = require('bluebird');
var redis = require('redis');
var Queue = require('./queue');
var Job = require('./job');
var exclude = require('../util/exclude');

function ZugZug(options) {
  if (!(this instanceof ZugZug)) return new ZugZug(options);
  if (options === undefined) options = {};
  this._options = options;
  this._client = ZugZug._createRedisClient(options);
  this.queues = {};
  if (options.prefix === undefined) this.prefix = 'zugzug:';
  else this.prefix = options.prefix;
}

ZugZug._createRedisClient = function _createRedisClient(options) {
  var client = redis.createClient(
    options.port,
    options.server,
    exclude(options, 'port', 'server', 'prefix')
  );
  [
    'brpoplpush',
    'hget',
    'hgetall',
    'hmget',
    'hmset',
    'hset',
    'incr',
    'lrange',
    'publish',
    'select',
    'quit'
  ].forEach(function(key) {
    client[key] = Promise.promisify(client[key], client);
  }.bind(client));
  return client;
};

ZugZug.prototype._createClient = function _createClient(callback) {
  var client = ZugZug._createRedisClient(this._options);
  return Promise.cast(
    this.database
    ? client.select(this.database).thenReturn(client)
    : client
  )
  .nodeify(callback);
};

ZugZug.prototype.useDatabase = function useDatabase(db, callback) {
  this.database = db;
  return this._client.select(db)
  .thenReturn(this)
  .nodeify(callback);
};

ZugZug.prototype.queue = function queue(name) {
  if (name === undefined) name = 'default';
  if (name in this.queues) return this.queues[name];
  this.queues[name] = new Queue(this, name);
  return this.queues[name];
};

ZugZug.prototype.getJob = function getJob(id, callback) {
  var zz = this;
  var job = new Job(this);
  return this._client.hgetall(zz.prefix + 'job:' + id)
  .then(function(data) {
    if (!data) return null;
    job.id = id;
    job.data = JSON.parse(data.data);
    job.queue = data.queue;
    job.state = data.state;
    job.progress = Number(data.progress);
    job.attempts = Number(data.attempts);
    job.maxAttempts = Number(data.maxAttempts);
    job.created = new Date(Number(data.created));
    job.updated = new Date(Number(data.updated));
    return job;
  })
  .nodeify(callback);
};

ZugZug.prototype.getJobLog = function getLog(id, callback) {
  var zz = this;
  return this._client.lrange(zz.prefix + 'job:' + id + ':log', 0, -1)
  .then(function(results) {
    return results.map(function(result) {
      var entry = JSON.parse(result);
      entry.date = new Date(entry.date);
      return entry;
    });
  })
  .nodeify(callback);
};

ZugZug.prototype.moveJob = function moveJob(id, toQueue, callback) {
  var zz = this;
  var db = this._client;
  return db.hmget(zz.prefix + 'job:' + id, ['queue', 'state'])
  .spread(function(fromQueue, state) {
    if (!state) return false;
    var m = db.multi()
    .hset(zz.prefix + 'job:' + id, 'queue', toQueue)
    .srem(zz.prefix + 'queue:' + fromQueue, id)
    .sadd(zz.prefix + 'queue:' + toQueue, id)
    .lrem(zz.prefix + 'queue:' + fromQueue + ':' + state, 0, id)
    .lpush(zz.prefix + 'queue:' + toQueue + ':' + state, id);
    return Promise.promisify(m.exec, m)()
    .thenReturn(true);
  })
  .nodeify(callback);
};

ZugZug.prototype.resetJob = function resetJob(id, callback) {
  var zz = this;
  var db = this._client;
  return db.hmget(zz.prefix + 'job:' + id, ['queue', 'state'])
  .spread(function(queue, state) {
    if (!state) return false;
    var now = new Date();
    var m = db.multi()
    .hmset(zz.prefix + 'job:' + id, {state: 'pending', updated: Number(now)})
    .lpush(zz.prefix + 'job:' + id + ':log', JSON.stringify({
      date: Number(now),
      message: 'Job reset.',
      state: 'pending'
    }))
    .lrem(zz.prefix + 'queue:' + queue + ':' + state, 0, id)
    .lpush(zz.prefix + 'queue:' + queue + ':pending', id);
    return Promise.promisify(m.exec, m)()
    .thenReturn(true);
  })
  .nodeify(callback);
};

ZugZug.prototype.startJob = function startJob(id, callback) {
  var zz = this;
  var db = this._client;
  return db.hmget(zz.prefix + 'job:' + id, ['queue', 'state'])
  .spread(function(queue, state) {
    if (!state) return null;
    var m = db.multi()
    .lrem(zz.prefix + 'queue:' + queue + ':' + state, 0, id)
    .lpush(zz.prefix + 'queue:' + queue + ':progress', id);
    return Promise.promisify(m.exec, m)()
    .thenReturn(id)
    .then(zz._start.bind(zz));
  })
  .nodeify(callback);
};

ZugZug.prototype._start = function _start(id) {
  var zz = this;
  var m = this._client.multi()
  .hmset(zz.prefix + 'job:' + id, {
    updated: Number(new Date()),
    state: 'progress',
    progress: 0
  })
  .lpush(zz.prefix + 'job:' + id + ':log', JSON.stringify({
    date: Number(new Date()),
    message: 'Job started.',
    state: 'progress',
    progress: 0
  }));
  return Promise.promisify(m.exec, m)()
  .thenReturn(id)
  .then(this.getJob.bind(this));
};

ZugZug.prototype.quit = function quit(callback) {
  return this._client.quit()
  .thenReturn(this)
  .nodeify(callback);
};

module.exports = ZugZug;