var expect = require('expect.js');
var Promise = require('bluebird');
var ZugZug = require('../lib/zugzug');
var Queue = require('../lib/queue');

describe('zugzug.queue([name]):Queue', function() {
  var zz;
  beforeEach(function() {
    zz = new ZugZug();
  });
  afterEach(function(done) {
    Promise.promisify(zz._client.flushall, zz._client)()
    .then(zz.quit.bind(zz))
    .done(function() {done();});
  });
  it('returns a new Queue instance', function() {
    expect(zz.queue('foo')).to.be.a(Queue);
  });
  it('passes the name to the queue', function() {
    expect(zz.queue('hello').name).to.equal('hello');
  });
  it('defaults to name "default"', function() {
    expect(zz.queue().name).to.equal('default');
  });
  it('returns the same queue for the same name', function() {
    var name1 = 'foo';
    var name2 = 'bar';
    var q1 = zz.queue(name1);
    var q2 = zz.queue(name1);
    expect(q2).to.equal(q1);
    var q3 = zz.queue(name2);
    expect(q3).not.to.equal(q1);
    expect(q3).not.to.equal(q2);
    expect(q3).to.equal(zz.queue(name2));
  });
  it('also returns the same queue for the default name', function() {
    var q0 = zz.queue('foo');
    var q1 = zz.queue();
    var q2 = zz.queue();
    expect(q1).not.to.equal(q0);
    expect(q2).to.equal(q1);
  });
  it('does not return queues that have been deleted', function() {
    var name = 'foo';
    var q0 = zz.queue(name);
    q0.delete();
    var q1 = zz.queue(name);
    expect(q1.name).to.equal(q0.name);
    expect(q1).not.to.equal(q0);
  });
});