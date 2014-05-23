var expect = require('expect.js');
var Promise = require('bluebird');
var ZugZug = require('../lib/zugzug');
var Job = require('../lib/job');

describe('queue.createJob([data, [maxFailures]]):Job', function() {
  var q, zz;
  before(function() {
    zz = new ZugZug();
    q = zz.queue();
  });
  after(function(done) {
    Promise.promisify(zz._client.flushall, zz._client)()
    .then(zz.quit.bind(zz))
    .done(function() {done();});
  });
  it('returns a new Job instance', function() {
    expect(q.createJob()).to.be.a(Job);
  });
  it('binds the new job to the queue', function() {
    expect(q.createJob().queue).to.equal(q.name);
  });
  it('passes the data to the job', function() {
    var data = {foo: 'bar'};
    var j = q.createJob(data);
    expect(j.data).to.equal(data);
  });
  it('passes the maxFailures to the job', function() {
    var maxFailures = 2;
    var j = q.createJob(undefined, maxFailures);
    expect(j.data).not.to.be(undefined);
    expect(j.maxFailures).to.equal(maxFailures);
  });
});