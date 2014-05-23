var expect = require('expect.js');
var Promise = require('bluebird');
var ZugZug = require('../lib/zugzug');
var Job = require('../lib/job');

describe('zugzug.resetJob(id):Promise(Boolean)', function() {
  var zz;
  beforeEach(function() {
    zz = new ZugZug();
  });
  afterEach(function(done) {
    Promise.promisify(zz._client.flushall, zz._client)()
    .then(zz.quit.bind(zz))
    .done(function() {done();});
  });
  it('returns a promise', function(done) {
    var p = zz.resetJob(0);
    expect(p).to.be.a(Promise);
    p.thenReturn().done(done);
  });
  it('resolves to false if the job does not exist', function(done) {
    zz.resetJob(0)
    .then(function(res) {
      expect(res).to.equal(false);
    })
    .done(done);
  });
  it('resolves to true if the job exists', function(done) {
    var job = new Job(zz, 'default');
    job.save()
    .then(function() {
      return zz.resetJob(job.id);
    })
    .then(function(res) {
      expect(res).to.equal(true);
    })
    .done(done);
  });
  it('updates the job and sets its state to "pending"', function(done) {
    var j0 = new Job(zz, 'default');
    j0.maxAttempts = 1;
    j0.save()
    .then(function() {
      return j0.fail();
    })
    .then(function() {
      expect(j0.state).to.equal('error');
      return new Promise(function(resolve, reject) {
        /*global setTimeout:false */
        setTimeout(function() {
          zz.resetJob(j0.id).then(resolve, reject);
        }, 1);
      });
    })
    .then(function() {
      return zz.getJob(j0.id);
    })
    .then(function(j1) {
      expect(j1.id).to.equal(j0.id);
      expect(+j1.updated).to.be.greaterThan(+j0.updated);
      expect(j1.state).to.equal('pending');
    })
    .done(done);
  });
  it('updates the job\'s log', function(done) {
    var job = new Job(zz, 'default');
    var oldlen = 0;
    job.save()
    .then(function() {
      return job.fail();
    })
    .then(function() {
      var m = zz._client.multi()
      .llen('zugzug:job:' + job.id + ':log');
      return Promise.promisify(m.exec, m)();
    })
    .spread(function(len) {
      oldlen = len;
      return zz.resetJob(job.id);
    })
    .then(function() {
      var m = zz._client.multi()
      .llen('zugzug:job:' + job.id + ':log');
      return Promise.promisify(m.exec, m)();
    })
    .spread(function(newlen) {
      expect(newlen).to.equal(oldlen + 1);
    })
    .done(done);
  });
});