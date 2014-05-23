var expect = require('expect.js');
var Promise = require('bluebird');
var ZugZug = require('../lib/zugzug');
var Job = require('../lib/job');

describe('zugzug.moveJob(id, toQueue):Promise(Boolean)', function() {
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
    var p = zz.moveJob(0, 'default');
    expect(p).to.be.a(Promise);
    p.thenReturn().done(done);
  });
  it('resolves to false if the job does not exist', function(done) {
    zz.moveJob(0, 'default')
    .then(function(res) {
      expect(res).to.equal(false);
    })
    .done(done);
  });
  it('resolves to true if the job exists', function(done) {
    var job = new Job(zz, 'default');
    job.save()
    .then(function() {
      return zz.moveJob(job.id, 'default');
    })
    .then(function(res) {
      expect(res).to.equal(true);
    })
    .done(done);
  });
  it('moves the job to the new queue', function(done) {
    var j0 = new Job(zz, 'foo');
    j0.save()
    .then(function() {
      return zz.moveJob(j0.id, 'bar');
    })
    .then(function() {
      var m = zz._client.multi()
      .hget('zugzug:job:' + j0.id, 'queue')
      .sismember('zugzug:queue:foo', j0.id)
      .sismember('zugzug:queue:bar', j0.id);
      return Promise.promisify(m.exec, m)();
    })
    .spread(function(queue, inFoo, inBar) {
      expect(queue).to.equal('bar');
      expect(inFoo).to.eql(false);
      expect(inBar).to.eql(true);
    })
    .then(function() {
      return zz.getJob(j0.id);
    })
    .then(function(j1) {
      expect(j1.queue).to.equal('bar');
    })
    .done(done);
  });
});