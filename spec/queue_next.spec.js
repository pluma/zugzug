var expect = require('expect.js');
var Promise = require('bluebird');
var redis = require('redis');
var ZugZug = require('../lib/zugzug');
var Job = require('../lib/job');

describe('queue.next([timeout]):Promise(Job?)', function() {
  var zz, q;
  beforeEach(function() {
    zz = new ZugZug();
    q = zz.queue();
  });
  afterEach(function(done) {
    redis.createClient().flushall(done);
  });
  it('returns a promise', function() {
    expect(q.next(1)).to.be.a(Promise);
  });
  it('resolves to null if the timeout was reached', function(done) {
    this.timeout(5000);
    q.next(1)
    .then(function(res) {
      expect(res).to.equal(null);
    })
    .done(done);
  });
  it('resolves to a Job when a job is in the queue', function(done) {
    q.createJob().save()
    .then(function() {
      return q.next();
    })
    .then(function(res) {
      expect(res).to.be.a(Job);
    })
    .done(done);
  });
  it('resolves to a Job when a job is added to the queue', function(done) {
    /*global process: false */
    process.nextTick(function() {
      q.createJob().save().done();
    });
    q.next()
    .then(function(res) {
      expect(res).to.be.a(Job);
    })
    .done(done);
  });
  it('updates the job and sets its state to "progress"', function(done) {
    var j0 = q.createJob();
    j0.save()
    .then(function() {
      return q.next();
    })
    .then(function(j1) {
      expect(j1.id).to.equal(j0.id);
      expect(+j1.updated).to.be.greaterThan(+j0.updated);
      expect(j1.state).to.equal('progress');
    })
    .done(done);
  });
});