var expect = require('expect.js');
var exclude = require('../util/exclude');

describe('exclude(obj, keys…):Object', function() {
  it('returns a new object', function() {
    var a = {};
    var b = exclude(a);
    expect(b).to.be.an('object');
    expect(Object.getPrototypeOf(b)).to.equal(Object.prototype);
    expect(b).to.not.equal(a);
  });
  it('copies all non-excluded properties', function() {
    var a = {foo: 0, bar: 1, qux: 2, quux: 3};
    var b = exclude(a);
    expect(b).to.eql(a);
    expect(b).to.not.equal(a);
  });
  it('strips all excluded properties', function() {
    var a = {foo: 0, bar: 1, qux: 2, quux: 3};
    var b = exclude(a, 'bar', 'quux');
    expect(b).to.have.property('foo', a.foo);
    expect(b).to.have.property('qux', a.qux);
    expect(b).to.not.have.property('bar');
    expect(b).to.not.have.property('quux');
  });
  it('does not modify the original object', function() {
    var a = {foo: 0, bar: 1, qux: 2, quux: 3};
    exclude(a, 'bar', 'quux');
    expect(a).to.have.property('bar', 1);
    expect(a).to.have.property('quux', 3);
  });
});