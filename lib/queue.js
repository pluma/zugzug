var Promise = require('bluebird');
var Job = require('./job');

function Queue(zugzug, name) {
  if (!(this instanceof Queue)) return new Queue(zugzug, name);
  this.zugzug = zugzug;
  this._client = zugzug._client;
  this.name = name;
}

Queue.prototype.createJob = function() {
  return new Job(this.zugzug, this.name);
};

Queue.prototype.next = function next(callback) {
  var db = this._client;
  return db.brpoplpush(
    'zugzug:queue:' + this.name + ':pending',
    'zugzug:queue:' + this.name + ':progress',
    0
  )
  .then(this.zugzug._start.bind(this.zugzug))
  .nodeify(callback);
};

Queue.prototype.delete = function del(callback) {
  delete this.zugzug.queues[this.name];
  var db = this._client;
  var m = db.multi()
  .smembers('zugzug:queue:' + this.name)
  .del('zugzug:queue:' + this.name);
  Job.states.forEach(function(state) {
    m = m.del('zugzug:queue:' + this.name + ':' + state);
  }.bind(this));
  return Promise.promisify(m.exec, m)()
  .spread(function(members) {
    var m = db.multi();
    members.forEach(function(id) {
      m = m.del('zugzug:job:' + id)
      .del('zugzug:job:' + id + ':log');
    });
    return Promise.promisify(m.exec, m)();
  })
  .thenReturn(this)
  .nodeify(callback);
};

module.exports = Queue;