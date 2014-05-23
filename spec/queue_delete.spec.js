var expect = require('expect.js');
var Promise = require('bluebird');
var ZugZug = require('../lib/zugzug');
var Job = require('../lib/job');

describe('queue.delete():Promise(self)', function() {
  var zz, q;
  beforeEach(function() {
    zz = new ZugZug();
    q = zz.queue();
  });
  afterEach(function(done) {
    Promise.promisify(zz._client.flushall, zz._client)()
    .then(zz.quit.bind(zz))
    .done(function() {done();});
  });
  it('returns a promise', function(done) {
    var p = q.delete();
    expect(p).to.be.a(Promise);
    p.thenReturn().done(done);
  });
  it('resolves to the instance', function(done) {
    q.delete()
    .then(function(res) {
      expect(res).to.equal(q);
    })
    .done(done);
  });
  it('deletes all associated jobs', function(done) {
    var j0 = q.createJob();
    var j1 = q.createJob();
    Promise.all([j0.save(), j1.save()])
    .then(function() {
      return q.delete();
    })
    .then(function() {
      return [zz.getJob(j0.id), zz.getJob(j1.id)];
    })
    .spread(function(res0, res1) {
      expect(res0).to.equal(null);
      expect(res1).to.equal(null);
    })
    .done(done);
  });
  it('does not delete unassociated jobs', function(done) {
    var qx = zz.queue('temp');
    var j0 = q.createJob();
    var j1 = q.createJob();
    Promise.all([j0.save(), j1.save()])
    .then(function() {
      return qx.delete();
    })
    .then(function() {
      return [zz.getJob(j0.id), zz.getJob(j1.id)];
    })
    .spread(function(res0, res1) {
      expect(res0).to.be.a(Job);
      expect(res1).to.be.a(Job);
      expect(res0.id).to.equal(j0.id);
      expect(res1.id).to.equal(j1.id);
    })
    .done(done);
  });
});