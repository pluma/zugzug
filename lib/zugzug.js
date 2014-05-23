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
}

ZugZug._createRedisClient = function _createRedisClient(options) {
  var client = redis.createClient(
    options.port,
    options.server,
    exclude(options, 'port', 'server')
  );
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
  ].forEach(function(key) {
    client[key] = Promise.promisify(client[key], client);
  }.bind(client));
  return client;
};

ZugZug.prototype.useDatabase = function useDatabase(db, callback) {
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
  var job = new Job(this);
  return this._client.hgetall('zugzug:job:' + id)
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

ZugZug.prototype.moveJob = function moveJob(id, toQueue, callback) {
  var db = this._client;
  return db.hmget('zugzug:job:' + id, ['queue', 'state'])
  .spread(function(fromQueue, state) {
    if (!state) return false;
    var m = db.multi()
    .hset('zugzug:job:' + id, 'queue', toQueue)
    .srem('zugzug:queue:' + fromQueue, id)
    .sadd('zugzug:queue:' + toQueue, id)
    .lrem('zugzug:queue:' + fromQueue + ':' + state, 0, id)
    .lpush('zugzug:queue:' + toQueue + ':' + state, id);
    return Promise.promisify(m.exec, m)()
    .thenReturn(true);
  })
  .nodeify(callback);
};

ZugZug.prototype.resetJob = function resetJob(id, callback) {
  var db = this._client;
  return db.hmget('zugzug:job:' + id, ['queue', 'state'])
  .spread(function(queue, state) {
    if (!state) return false;
    var now = new Date();
    var m = db.multi()
    .hmset('zugzug:job:' + id, {state: 'pending', updated: Number(now)})
    .lpush('zugzug:job:' + id + ':log', JSON.stringify({
      date: Number(now),
      message: 'Job reset.',
      state: 'pending'
    }))
    .lrem('zugzug:queue:' + queue + ':' + state, 0, id)
    .lpush('zugzug:queue:' + queue + ':pending', id);
    return Promise.promisify(m.exec, m)()
    .thenReturn(true);
  })
  .nodeify(callback);
};

ZugZug.prototype.startJob = function startJob(id, callback) {
  var zz = this;
  var db = this._client;
  return db.hmget('zugzug:job:' + id, ['queue', 'state'])
  .spread(function(queue, state) {
    if (!state) return null;
    var m = db.multi()
    .lrem('zugzug:queue:' + queue + ':' + state, 0, id)
    .lpush('zugzug:queue:' + queue + ':progress', id);
    return Promise.promisify(m.exec, m)()
    .thenReturn(id)
    .then(zz._start.bind(zz));
  })
  .nodeify(callback);
};

ZugZug.prototype._start = function _start(id) {
  var m = this._client.multi()
  .hmset('zugzug:job:' + id, {
    updated: Number(new Date()),
    state: 'progress',
    progress: 0
  })
  .lpush('zugzug:job:' + id + ':log', JSON.stringify({
    date: Number(new Date()),
    message: 'Job started.',
    state: 'progress',
    progress: 0
  }));
  return Promise.promisify(m.exec, m)()
  .thenReturn(id)
  .then(this.getJob.bind(this));
};

module.exports = ZugZug;