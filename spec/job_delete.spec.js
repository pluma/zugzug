var expect = require('expect.js');
var Promise = require('bluebird');
var ZugZug = require('../lib/zugzug');
var Job = require('../lib/job');

describe('job.delete():Promise(self)', function() {
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
      var p = job.delete();
      expect(p).to.be.a(Promise);
      return p.thenReturn();
    })
    .done(done);
  });
  it('resolves to the instance', function(done) {
    job.save()
    .then(function() {
      return job.delete();
    })
    .then(function(res) {
      expect(res).to.equal(job);
    })
    .done(done);
  });
  it('deletes the job from the database', function(done) {
    var id;
    job.save()
    .then(function() {
      expect(job.id).to.equal('1');
      id = job.id;
      return job.delete();
    })
    .then(function() {
      return zz.getJob(id);
    })
    .then(function(res) {
      expect(res).to.equal(null);
    })
    .done(done);
  });
  it('resets the job\'s state', function(done) {
    job.save()
    .then(function() {
      return job.delete();
    })
    .then(function() {
      expect(job.id).to.be(undefined);
      expect(job.created).to.be(undefined);
      expect(job.updated).to.be(undefined);
      expect(job.state).to.be(undefined);
    })
    .done(done);
  });
  it('deletes the job\'s log', function(done) {
    var id;
    job.save()
    .then(function() {
      expect(job.id).to.equal('1');
      id = job.id;
      return job.delete();
    })
    .then(function() {
      var m = zz._client.multi()
      .llen('zugzug:job:' + id + ':log');
      return Promise.promisify(m.exec, m)();
    })
    .spread(function(newlen) {
      expect(newlen).to.equal(0);
    })
    .done(done);
  });
});