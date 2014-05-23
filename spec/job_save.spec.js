var expect = require('expect.js');
var Promise = require('bluebird');
var redis = require('redis');
var ZugZug = require('../lib/zugzug');
var Job = require('../lib/job');

describe('job.save():self', function() {
  var zz;
  beforeEach(function() {
    zz = new ZugZug();
  });
  afterEach(function(done) {
    redis.createClient().flushall(done);
  });
  it('returns a promise', function() {
    var job = new Job(zz, 'default');
    expect(job.save()).to.be.a(Promise);
  });
  it('resolves to the instance', function(done) {
    var job = new Job(zz, 'default');
    job.save()
    .then(function(res) {
      expect(res).to.equal(job);
    })
    .done(done);
  });
  it('assigns the job a new id', function(done) {
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
      expect(id).to.equal(job.id);
    })
    .done(done);
  });
  it('updates the job and sets its state to "pending"', function(done) {
    var job = new Job(zz, 'default');
    var now = new Date();
    expect(job.created).to.be(undefined);
    expect(job.updated).to.be(undefined);
    expect(job.state).to.be(undefined);
    job.save()
    .then(function() {
      expect(+job.created).not.to.be.lessThan(+now);
      expect(+job.updated).not.to.be.lessThan(+now);
      expect(+job.updated).to.equal(+job.created);
      expect(job.state).to.equal('pending');
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