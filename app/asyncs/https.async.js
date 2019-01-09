/**
 * Lib for the httpsAsync. 
*/

// Dependencies
const util = require('util');
const https = require('https');

let httpsAsync = {};

httpsAsync.request = util.promisify(https.request);

module.exports = httpsAsync;
