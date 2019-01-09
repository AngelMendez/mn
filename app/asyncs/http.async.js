/**
 * Lib for the httpAsync. 
*/

// Dependencies
const util = require('util');
const http = require('http');

let httpAsync = {};

httpAsync.request = util.promisify(http.request);

module.exports = httpAsync;
