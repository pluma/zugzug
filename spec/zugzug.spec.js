var expect = require('expect.js');
var Promise = require('bluebird');
var ZugZug = require('../lib/zugzug');

describe('new ZugZug([options])', function() {
  var zz;
  afterEach(function(done) {
    if (!zz) return done();
    Promise.promisify(zz._client.flushall, zz._client)()
    .then(zz.quit.bind(zz))
    .done(function() {done();});
  });
  it('is a constructor', function() {
    zz = new ZugZug();
    expect(zz).to.be.a(ZugZug);
  });
  it('can be called as a function', function() {
    var zugzug = ZugZug;
    zz = zugzug();
    expect(zz).to.be.a(ZugZug);
  });
});