var expect = require('expect.js');
var Promise = require('bluebird');
var ZugZug = require('../lib/zugzug');
var Job = require('../lib/job');

describe('new Job(zugzug, queue)', function() {
  var zz;
  before(function() {
    zz = new ZugZug();
  });
  after(function(done) {
    Promise.promisify(zz._client.flushall, zz._client)()
    .then(zz.quit.bind(zz))
    .done(function() {done();});
  });
  it('is a constructor', function() {
    var q = new Job(zz);
    expect(q).to.be.a(Job);
  });
  it('can be called as a function', function() {
    var job = Job;
    var q = job(zz);
    expect(q).to.be.a(Job);
  });
});