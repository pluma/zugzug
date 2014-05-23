var expect = require('expect.js');
var ZugZug = require('../lib/zugzug');
var Queue = require('../lib/queue');

describe('new Queue(zugzug, name)', function() {
  var zz = new ZugZug();
  it('is a constructor', function() {
    var q = new Queue(zz);
    expect(q).to.be.a(Queue);
  });
  it('can be called as a function', function() {
    var queue = Queue;
    var q = queue(zz);
    expect(q).to.be.a(Queue);
  });
});