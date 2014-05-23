var expect = require('expect.js');
var Promise = require('bluebird');
var ZugZug = require('../lib/zugzug');
var Job = require('../lib/job');

describe('job.save():self', function() {
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
    var job = new Job(zz, 'default');
    var p = job.save();
    expect(p).to.be.a(Promise);
    p.thenReturn().done(done);
  });
  it('resolves to the instance', function(done) {
    var job = new Job(zz, 'default');
    job.save()
    .then(function(res) {
      expect(res).to.equal(job);
    })
    .done(done);
  });
  it('assigns the job a new id if job has no id', function(done) {
    var jobId;
    var job = new Job(zz, 'default');
    expect(job.id).to.be(undefined);
    var m = zz._client.multi()
    .get('zugzug:id');
    Promise.promisify(m.exec, m)()
    .spread(function(id) {
      expect(id).to.equal(null);
      return job.save();
    })
    .then(function() {
      expect(job.id).to.equal('1');
      var m = zz._client.multi()
      .get('zugzug:id');
      return Promise.promisify(m.exec, m)();
    })
    .spread(function(id) {
      jobId = id;
      expect(id).to.equal(job.id);
      return job.save();
    })
    .then(function() {
      expect(job.id).to.equal(jobId);
    })
    .done(done);
  });
  it('sets the job\'s state to "pending" if job has no id', function(done) {
    var state = 'error';
    var job = new Job(zz, 'default');
    var now = new Date();
    expect(job.id).to.be(undefined);
    expect(job.state).to.be(undefined);
    job.save()
    .then(function() {
      expect(job.state).to.be('pending');
      job.state = state;
      return job.save();
    })
    .then(function() {
      expect(job.state).to.be(state);
    })
    .done(done);
  });
  it('updates the job and sets its timestamps', function(done) {
    var job = new Job(zz, 'default');
    var now = new Date();
    var created, updated;
    expect(job.created).to.be(undefined);
    expect(job.updated).to.be(undefined);
    job.save()
    .then(function() {
      expect(Number(job.created)).not.to.be.lessThan(Number(now));
      expect(Number(job.updated)).not.to.be.lessThan(Number(now));
      expect(Number(job.updated)).to.equal(Number(job.created));
      created = job.created;
      updated = job.updated;
      return new Promise(function(resolve, reject) {
        /*global setTimeout:false */
        setTimeout(function() {
          job.save().then(resolve, reject);
        }, 1);
      });
    })
    .then(function() {
      expect(Number(job.created)).to.equal(Number(created));
      expect(Number(job.updated)).to.be.greaterThan(Number(updated));
    })
    .done(done);
  });
  it('updates the job\'s log', function(done) {
    var job = new Job(zz, 'default');
    var oldlen = 0;
    job.save()
    .then(function() {
      var m = zz._client.multi()
      .llen('zugzug:job:' + job.id + ':log');
      return Promise.promisify(m.exec, m)();
    })
    .spread(function(len) {
      expect(oldlen).to.equal(0);
      oldlen = len;
      return zz.startJob(job.id);
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