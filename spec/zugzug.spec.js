var expect = require('expect.js');
var ZugZug = require('../lib/zugzug');

describe('new ZugZug([options])', function() {
  it('is a constructor', function() {
    var zz = new ZugZug();
    expect(zz).to.be.a(ZugZug);
  });
  it('can be called as a function', function() {
    var zugzug = ZugZug;
    var zz = zugzug();
    expect(zz).to.be.a(ZugZug);
  });
});