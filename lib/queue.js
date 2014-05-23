var Promise = require('bluebird');
var Job = require('./job');

function Queue(zugzug, name) {
  if (!(this instanceof Queue)) return new Queue(zugzug, name);
  this.zugzug = zugzug;
  this._client = zugzug._client;
  this.name = name;
}

Queue.prototype.createJob = function(data, maxFailures) {
  var job = new Job(this.zugzug, this.name);
  if (data !== undefined) job.data = data;
  if (maxFailures !== undefined) job.maxFailures = maxFailures;
  return job;
};

Queue.prototype.getInfo = function(callback) {
  var zz = this.zugzug;
  var queue = this.name;
  var m = this._client.multi()
  .scard(zz.prefix + 'queue:' + queue);
  Job.states.forEach(function(state) {
    m = m.llen(zz.prefix + 'queue:' + queue + ':' + state);
  });
  return Promise.promisify(m.exec, m)()
  .spread(function(total) {
    var result = {total: total};
    Array.prototype.slice.call(arguments, 1)
    .forEach(function(num, i) {
      result[Job.states[i]] = Number(num);
    });
    return result;
  })
  .nodeify(callback);
};

Queue.prototype.next = function next(timeout, callback) {
  if (typeof timeout === 'function') {
    callback = timeout;
    timeout = undefined;
  }
  if (timeout === undefined) timeout = 0;
  var queue = this;
  var zz = this.zugzug;
  return zz._createClient()
  .then(function(db) {
    return db.brpoplpush(
      zz.prefix + 'queue:' + queue.name + ':pending',
      zz.prefix + 'queue:' + queue.name + ':progress',
      timeout
    )
    .then(function(id) {
      return db.quit().thenReturn(id ? zz._start(id) : null);
    }, function(err) {
      return db.quit().thenThrow(err);
    });
  })
  .nodeify(callback);
};

Queue.prototype.delete = function del(callback) {
  delete this.zugzug.queues[this.name];
  var zz = this.zugzug;
  var db = this._client;
  var m = db.multi()
  .smembers(zz.prefix + 'queue:' + this.name)
  .del(zz.prefix + 'queue:' + this.name);
  Job.states.forEach(function(state) {
    m = m.del(zz.prefix + 'queue:' + this.name + ':' + state);
  }.bind(this));
  return Promise.promisify(m.exec, m)()
  .spread(function(members) {
    var m = db.multi();
    members.forEach(function(id) {
      m = m.del(zz.prefix + 'job:' + id)
      .del(zz.prefix + 'job:' + id + ':log');
    });
    return Promise.promisify(m.exec, m)();
  })
  .thenReturn(this)
  .nodeify(callback);
};

module.exports = Queue;