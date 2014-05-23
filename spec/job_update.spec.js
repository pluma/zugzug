var expect = require('expect.js');
var Promise = require('bluebird');
var ZugZug = require('../lib/zugzug');
var Job = require('../lib/job');

describe('job.update(progress, [message]):Promise(self)', function() {
  var zz, job;
  beforeEach(function() {
    zz = new ZugZug();
    job = new Job(zz, 'default');
  });
  afterEach(function(done) {
    Promise.promisify(zz._client.flushall, zz._client)()
    .then(zz.quit.bind(zz))
    .done(function() {done();});
  });
  it('returns a promise', function(done) {
    job.save()
    .then(function() {
      var p = job.update(0.5);
      expect(p).to.be.a(Promise);
      return p.thenReturn();
    })
    .done(done);
  });
  it('resolves to the instance', function(done) {
    job.save()
    .then(function() {
      return job.update(0.5);
    })
    .then(function(res) {
      expect(res).to.equal(job);
    })
    .done(done);
  });
  it('updates the job and sets its progress to the given value', function(done) {
    var progress = 0.5;
    var updated;
    job.save()
    .then(function() {
      updated = job.updated;
      return new Promise(function(resolve, reject) {
        /*global setTimeout:false */
        setTimeout(function() {
          job.update(progress).then(resolve, reject);
        }, 1);
      });
    })
    .then(function() {
      expect(Number(job.updated)).to.be.greaterThan(Number(updated));
      expect(job.progress).to.equal(progress);
    })
    .done(done);
  });
  it('does not update the job\'s log if no message is provided', function(done) {
    var oldlen = 0;
    var progress = 0.5;
    job.save()
    .then(function() {
      var m = zz._client.multi()
      .llen('zugzug:job:' + job.id + ':log');
      return Promise.promisify(m.exec, m)();
    })
    .spread(function(len) {
      oldlen = len;
      return job.update(progress);
    })
    .then(function() {
      var m = zz._client.multi()
      .llen('zugzug:job:' + job.id + ':log');
      return Promise.promisify(m.exec, m)();
    })
    .spread(function(newlen) {
      expect(newlen).to.equal(oldlen);
    })
    .done(done);
  });
  it('does update the job\'s log if a message is provided', function(done) {
    var oldlen = 0;
    var progress = 0.5;
    var message = 'foo';
    job.save()
    .then(function() {
      var m = zz._client.multi()
      .llen('zugzug:job:' + job.id + ':log');
      return Promise.promisify(m.exec, m)();
    })
    .spread(function(len) {
      oldlen = len;
      return job.update(progress, message);
    })
    .then(function() {
      var m = zz._client.multi()
      .llen('zugzug:job:' + job.id + ':log')
      .lindex('zugzug:job:' + job.id + ':log', 0);
      return Promise.promisify(m.exec, m)();
    })
    .spread(function(newlen, entry) {
      entry = JSON.parse(entry);
      expect(newlen).to.equal(oldlen + 1);
      expect(entry).to.have.property('message', message);
      expect(entry).to.have.property('progress', progress);
    })
    .done(done);
  });
});