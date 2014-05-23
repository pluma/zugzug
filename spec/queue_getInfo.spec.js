var expect = require('expect.js');
var Promise = require('bluebird');
var redis = require('redis');
var ZugZug = require('../lib/zugzug');
var Job = require('../lib/job');

describe('queue.getInfo():Promise(Object)', function() {
  var zz, q;
  beforeEach(function() {
    zz = new ZugZug();
    q = zz.queue();
  });
  afterEach(function(done) {
    redis.createClient().flushall(done);
  });
  it('returns a promise', function() {
    expect(q.getInfo()).to.be.a(Promise);
  });
  it('resolves to an object', function(done) {
    q.getInfo()
    .then(function(res) {
      expect(res).to.be.an('object');
    })
    .done(done);
  });
  it('indicates the total number of jobs in the queue', function(done) {
    q.getInfo()
    .then(function(res) {
      expect(res).to.have.property('total', 0);
      return q.createJob().save();
    })
    .then(function() {
      return q.getInfo();
    })
    .then(function(res) {
      expect(res).to.have.property('total', 1);
    })
    .done(done);
  });
  it('indicates the number of jobs in the queue for each state', function(done) {
    var job = q.createJob();
    q.getInfo()
    .then(function(res) {
      expect(res).to.have.property('pending', 0);
      expect(res).to.have.property('progress', 0);
      expect(res).to.have.property('error', 0);
      expect(res).to.have.property('done', 0);
      return job.save().then(function() {return q.getInfo();});
    })
    .then(function(res) {
      expect(res).to.have.property('pending', 1);
      expect(res).to.have.property('progress', 0);
      expect(res).to.have.property('error', 0);
      expect(res).to.have.property('done', 0);
      return job.start().then(function() {return q.getInfo();});
    })
    .then(function(res) {
      expect(res).to.have.property('pending', 0);
      expect(res).to.have.property('progress', 1);
      expect(res).to.have.property('error', 0);
      expect(res).to.have.property('done', 0);
      return job.fail().then(function() {return q.getInfo();});
    })
    .then(function(res) {
      expect(res).to.have.property('pending', 0);
      expect(res).to.have.property('progress', 0);
      expect(res).to.have.property('error', 1);
      expect(res).to.have.property('done', 0);
      return job.start().then(function() {return q.getInfo();});
    })
    .then(function(res) {
      expect(res).to.have.property('pending', 0);
      expect(res).to.have.property('progress', 1);
      expect(res).to.have.property('error', 0);
      expect(res).to.have.property('done', 0);
      return job.complete().then(function() {return q.getInfo();});
    })
    .then(function(res) {
      expect(res).to.have.property('pending', 0);
      expect(res).to.have.property('progress', 0);
      expect(res).to.have.property('error', 0);
      expect(res).to.have.property('done', 1);
    })
    .done(done);
  });
});