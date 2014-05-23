var expect = require('expect.js');
var ZugZug = require('../lib/zugzug');
var Job = require('../lib/job');

describe('new Job(zugzug, queue)', function() {
  var zz = new ZugZug();
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