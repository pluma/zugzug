var Promise = require('bluebird');

function Job(zugzug, queue) {
  if (!(this instanceof Job)) return new Job(zugzug, queue);
  this.zugzug = zugzug;
  this._client = zugzug._client;
  this.data = {};
  this.queue = queue;
  this.progress = 0;
  this.failures = 0;
  this.maxFailures = 1;
}

Job.states = ['pending', 'progress', 'error', 'done'];

Job.prototype.save = function save(callback) {
  var job = this;
  var db = this._client;
  return (
    job.id
    ? job._save()
    : (
      db.incr('zugzug:id')
      .then(function(id) {
        job.id = id;
        job.state = 'pending';
        job.created = new Date();
        job.updated = job.created;
        return job._save();
      })
      .then(function() {
        var m = db.multi()
        .lpush('zugzug:job:' + job.id + ':log', JSON.stringify({
          date: Number(job.created),
          message: 'Job created.',
          state: job.state
        }))
        .sadd('zugzug:queue', job.queue)
        .sadd('zugzug:queue:' + job.queue, job.id)
        .lpush('zugzug:queue:' + job.queue + ':' + job.state, job.id);
        return Promise.promisify(m.exec, m)();
      })
    )
  )
  .thenReturn(job)
  .nodeify(callback);
};

Job.prototype._save = function _save() {
  return this._client
  .hmset('zugzug:job:' + this.id, {
    data: JSON.stringify(this.data),
    queue: this.queue,
    state: this.state,
    progress: this.progress,
    failures: this.failures,
    maxFailures: this.maxFailures,
    created: Number(this.created),
    updated: Number(this.updated)
  });
};

Job.prototype.update = function update(progress, message, callback) {
  if (typeof message === 'function') {
    callback = message;
    message = undefined;
  }
  this.updated = new Date();
  if (progress !== undefined) this.progress = progress;
  var m = this._client.multi()
  .hmset('zugzug:job:' + this.id, {
    updated: Number(this.updated),
    progress: this.progress
  });
  if (message) {
    m = m.lpush('zugzug:job:' + this.id + ':log', JSON.stringify({
      date: Number(this.updated),
      progress: this.progress,
      message: message
    }));
  }
  return Promise.promisify(m.exec, m)()
  .thenReturn(this)
  .nodeify(callback);
};

Job.prototype.log = function log(message, details, callback) {
  if (typeof details === 'function') {
    callback = details;
    details = undefined;
  }
  this.updated = new Date();
  var obj = {
    date: Number(this.updated),
    message: message
  };
  if (details) obj.details = details;
  var m = this._client.multi()
  .lpush('zugzug:job:' + this.id + ':log', JSON.stringify(obj))
  .hmset('zugzug:job:' + this.id, {updated: Number(this.updated)});
  return Promise.promisify(m.exec, m)()
  .thenReturn(this)
  .nodeify(callback);
};

Job.prototype.complete = function complete(callback) {
  this.updated = new Date();
  this.state = 'done';
  var m = this._client.multi()
  .hmset('zugzug:job:' + this.id, {
    updated: Number(this.updated),
    state: 'done'
  })
  .lpush('zugzug:job:' + this.id + ':log', JSON.stringify({
    date: Number(this.updated),
    message: 'Job complete.',
    state: 'done',
    success: true
  }))
  .lrem('zugzug:queue:' + this.queue + ':progress', 0, this.id)
  .lpush('zugzug:queue:' + this.queue + ':done', this.id);
  return Promise.promisify(m.exec, m)()
  .thenReturn(this)
  .nodeify(callback);
};

Job.prototype.fail = function fail(details, callback) {
  if (typeof details === 'function') {
    callback = details;
    details = undefined;
  }
  this.updated = new Date();
  this.failures += 1;
  if (!this.maxFailures || this.failures < this.maxFailures) {
    this.state = 'pending';
  } else {
    this.state = 'error';
  }
  var obj = {
    date: Number(this.updated),
    message: 'Job failed.',
    state: this.state,
    success: false
  };
  if (details) obj.details = details;
  var m = this._client.multi()
  .hmset('zugzug:job:' + this.id, {
    updated: Number(this.updated),
    failures: this.failures,
    state: this.state
  })
  .lpush('zugzug:job:' + this.id + ':log', JSON.stringify(obj))
  .lrem('zugzug:queue:' + this.queue + ':progress', 0, this.id)
  .lpush('zugzug:queue:' + this.queue + ':' + this.state, this.id);
  return Promise.promisify(m.exec, m)()
  .thenReturn(this)
  .nodeify(callback);
};

Job.prototype.delete = function del(callback) {
  if (!this.id) return Promise.resolve(this);
  var job = this;
  var db = this._client;
  var m = db.multi()
  .srem('zugzug:queue:' + job.queue, job.id)
  .lrem('zugzug:queue:' + job.queue + ':' + job.state, 0, job.id)
  .del('zugzug:job:' + job.id + ':log')
  .del('zugzug:job:' + job.id);
  delete job.id;
  return Promise.promisify(m.exec, m)()
  .thenReturn(job)
  .nodeify(callback);
};

module.exports = Job;