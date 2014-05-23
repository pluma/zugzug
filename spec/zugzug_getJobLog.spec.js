var expect = require('expect.js');
var Promise = require('bluebird');
var redis = require('redis');
var ZugZug = require('../lib/zugzug');
var Job = require('../lib/job');

describe('zugzug.getJobLog(id):Promise(Object[])', function() {
  var zz;
  beforeEach(function() {
    zz = new ZugZug();
  });
  afterEach(function(done) {
    redis.createClient().flushall(done);
  });
  it('returns a promise', function() {
    expect(zz.getJobLog(0)).to.be.a(Promise);
  });
  it('resolves to an empty array if the job does not exist', function(done) {
    zz.getJobLog(0)
    .then(function(res) {
      expect(res).to.be.an(Array);
      expect(res).to.be.empty();
    })
    .done(done);
  });
  it('resolves to an array of log entries if the job exists', function(done) {
    var job = new Job(zz, 'default');
    job.save()
    .then(function() {
      return job.fail();
    })
    .then(function() {
      return zz.getJobLog(job.id);
    })
    .then(function(res) {
      expect(res).to.be.an(Array);
      expect(res).not.to.be.empty();
      res.forEach(function(entry) {
        expect(entry).to.be.an('object');
        expect(entry).to.have.property('date');
        expect(entry.date).to.be.a(Date);
        expect(Number(entry.date)).not.to.be(NaN);
      });
    })
    .done(done);
  });
});