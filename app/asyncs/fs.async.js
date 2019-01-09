/**
 * Lib for the fsAsync.
 */

// Dependencies
const util = require('util');
const fs = require('fs');

let fsAsync = {};

fsAsync.readFile = util.promisify(fs.readFile);
fsAsync.open = util.promisify(fs.open);
fsAsync.close = util.promisify(fs.close);
fsAsync.writeFile = util.promisify(fs.writeFile);
fsAsync.ftruncate = util.promisify(fs.ftruncate);
fsAsync.unlink = util.promisify(fs.unlink);
fsAsync.readdir = util.promisify(fs.readdir);

module.exports = fsAsync;
