var expect = require('expect.js');
var Promise = require('bluebird');
var redis = require('redis');
var ZugZug = require('../lib/zugzug');
var Job = require('../lib/job');

describe('job.complete():Promise(self)', function() {
  var zz, job;
  beforeEach(function() {
    zz = new ZugZug();
    job = new Job(zz, 'default');
  });
  afterEach(function(done) {
    redis.createClient().flushall(done);
  });
  it('returns a promise', function(done) {
    job.save()
    .then(function() {
      expect(job.complete()).to.be.a(Promise);
    })
    .done(done);
  });
  it('resolves to the instance', function(done) {
    job.save()
    .then(function() {
      return job.complete();
    })
    .then(function(res) {
      expect(res).to.equal(job);
    })
    .done(done);
  });
  it('updates the job and sets its state to "done"', function(done) {
    var updated;
    job.save()
    .then(function() {
      updated = job.updated;
      expect(job.state).to.equal('pending');
      return new Promise(function(resolve, reject) {
        /*global setTimeout:false */
        setTimeout(function() {
          job.complete().then(resolve, reject);
        }, 1);
      });
    })
    .then(function() {
      expect(Number(job.updated)).to.be.greaterThan(Number(updated));
      expect(job.state).to.equal('done');
    })
    .done(done);
  });
  it('updates the job\'s log', function(done) {
    var oldlen = 0;
    job.save()
    .then(function() {
      var m = zz._client.multi()
      .llen('zugzug:job:' + job.id + ':log');
      return Promise.promisify(m.exec, m)();
    })
    .spread(function(len) {
      oldlen = len;
      return job.complete();
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
      expect(entry).to.have.property('state', 'done');
      expect(entry).to.have.property('success', true);
    })
    .done(done);
  });
});