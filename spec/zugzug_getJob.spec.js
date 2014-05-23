var expect = require('expect.js');
var Promise = require('bluebird');
var redis = require('redis');
var ZugZug = require('../lib/zugzug');
var Job = require('../lib/job');

describe('zugzug.getJob(id):Promise(Job?)', function() {
  var zz;
  beforeEach(function() {
    zz = new ZugZug();
  });
  afterEach(function(done) {
    redis.createClient().flushall(done);
  });
  it('returns a promise', function() {
    expect(zz.getJob(0)).to.be.a(Promise);
  });
  it('resolves to null if the job does not exist', function(done) {
    zz.getJob(0)
    .then(function(res) {
      expect(res).to.equal(null);
    })
    .done(done);
  });
  it('resolves to a Job if the job exists', function(done) {
    var j0 = new Job(zz, 'default');
    j0.save()
    .then(function() {
      return zz.getJob(j0.id);
    })
    .then(function(j1) {
      expect(j1).to.be.a(Job);
      expect(j1.id).to.equal(j0.id);
    })
    .done(done);
  });
});