var expect = require('expect.js');
var Promise = require('bluebird');
var redis = require('redis');
var ZugZug = require('../lib/zugzug');
var Job = require('../lib/job');

describe('job.fail([details]):Promise(self)', function() {
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
      expect(job.fail()).to.be.a(Promise);
    })
    .done(done);
  });
  it('resolves to the instance', function(done) {
    job.save()
    .then(function() {
      return job.fail();
    })
    .then(function(res) {
      expect(res).to.equal(job);
    })
    .done(done);
  });
  it('updates the job and increments its failures', function(done) {
    var updated;
    job.save()
    .then(function() {
      updated = job.updated;
      expect(job.failures).to.equal(0);
      return new Promise(function(resolve, reject) {
        /*global setTimeout:false */
        setTimeout(function() {
          job.fail().then(resolve, reject);
        }, 1);
      });
    })
    .then(function() {
      expect(Number(job.updated)).to.be.greaterThan(Number(updated));
      expect(job.failures).to.equal(1);
    })
    .done(done);
  });
  it('sets the job\'s state to "error" if maxFailures is reached', function(done) {
    job.maxFailures = 1;
    job.save()
    .then(function() {
      return job.fail();
    })
    .then(function() {
      expect(job.state).to.equal('error');
    })
    .done(done);
  });
  it('sets the job\'s state to "pending" if maxFailures is not reached', function(done) {
    job.maxFailures = 2;
    job.save()
    .then(function() {
      return job.fail();
    })
    .then(function() {
      expect(job.state).to.equal('pending');
    })
    .done(done);
  });
  it('sets the job\'s state to "pending" if maxFailures is 0', function(done) {
    job.maxFailures = 0;
    job.save()
    .then(function() {
      return job.fail();
    })
    .then(function() {
      expect(job.state).to.equal('pending');
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
      return job.fail();
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
      expect(entry).to.have.property('state', job.state);
      expect(entry).to.have.property('success', false);
    })
    .done(done);
  });
  it('updates the job\'s log with the given details', function(done) {
    var details = {some: 'data'};
    job.save()
    .then(function() {
      return job.fail(details);
    })
    .then(function() {
      var m = zz._client.multi()
      .lindex('zugzug:job:' + job.id + ':log', 0);
      return Promise.promisify(m.exec, m)();
    })
    .spread(function(entry) {
      entry = JSON.parse(entry);
      expect(entry).to.have.property('details');
      expect(entry.details).to.eql(details);
    })
    .done(done);
  });
});