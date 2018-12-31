// Helpers for various tasks

// Dependencies
const crypto = require('crypto');
const config = require('./config');
const https = require('https');
const querystring = require('querystring');
const path = require('path');
const fs = require('fs');


// Container for all the helpers
let helpers = {};

// Create a SHA256 hash
helpers.hash = (str) => {
    if (typeof(str) == 'string' && str.length > 0) {
        const hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
        return hash;
    } else {
        return false;
    }
};

// Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = str => {
    try {
        const obj = JSON.parse(str);
        return obj;
    } catch (e) {
        return {};
    }
}

// Create a string of random alphanumeric characters, of a given length
helpers.createRandomString = strLength => {
    strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;
    if (strLength) {
        // Define all the possible characters that could go into a string
        const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

        // Start the final string
        let str = '';

        for (let i = 1; i <= strLength; i++) {
            // Get a random character from the possibleCharacters string
            const randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));

            // Append this character to the final string
            str += randomCharacter;
        }

        // Return the final string
        return str;
    } else {
        return false;
    }
};

// Send an SMS message via Twilio
helpers.sendTwilioSMS = (phone, message, callback) => {
    // Validate parameters
    phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
    message = typeof(message) == 'string' && message.trim().length > 0 && message.trim().length <= 1600 ? message.trim() : false;

    if (phone && message) {
        // Config the request payload
        const payload = {
            'From': config.twilio.fromPhone,
            'To': '+52' + phone,
            'Body': message,
        };

        // Stringify the payload
        const stringPayload = querystring.stringify(payload);

        // Configure the request details
        const requestDetails = {
            'protocol': 'https:',
            'hostname': 'api.twilio.com',
            'method': 'POST',
            'path': '/2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
            'auth': config.twilio.accountSid + ':' + config.twilio.authToken,
            'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringPayload),
            },
        };

        // Instantiate the request object
        const req = https.request(requestDetails, res => {
            // Grab the status of the sent request
            const status = res.statusCode;

            // Callback successfully if the request went through
            if (status == 200 || status == 201) {
                callback(false);
            } else {
                callback('Status code returned was ' + status);
            }
        });

        // bind to the error event so it does not get thrown
        req.on('error', err => {
            callback(err);
        });

        // Add the payload
        req.write(stringPayload);

        // End the request
        req.end();

    } else {
        callback('Given parameters were missing or invalid.');
    }
};

// Get the string content of a template
helpers.getTemplate = (templateName, data) => 
    new Promise((resolve, reject) => {
        templateName = typeof(templateName) == 'string' && templateName.length > 0 ? templateName : false;
        data = typeof(data) == 'object' && data !== null ? data : {};

        if (templateName) {
            const templatesDir = path.join(__dirname, '/../templates/');
            fs.readFile(`${templatesDir}${templateName}.html`, 'utf8', (err, str) => {
                if (!err && str && str.length > 0) {
                    // Do interpolation on the string
                    const finalString = helpers.interpolate(str, data);
                    resolve(finalString);
                } else {
                    reject('No template could be found');
                }
            });
        } else {
            reject('A valid template name was not specified');
        }
    });

// Add the universal header and footer to a string, and pass provided data object to header and footer to interpolation
helpers.addUniversalTemplates = (str, data) => 
    new Promise((resolve, reject) => {
        str = typeof(str) == 'string' && str.length > 0 ? str : '';
        data = typeof(data) == 'object' && data !== null ? data : {};

        // Get the header
        helpers.getTemplate('_header', data)
            .then(headerString => {
                // Get the footer
                helpers.getTemplate('_footer', data)
                    .then(footerString => {
                        // Add them all together
                        const fullString = headerString + str + footerString;
                        resolve(fullString);
                    })
                    .catch(err => reject('Coud not find the footer template'));
            })
            .catch(err => reject('Could not find the header template.'));
    });

// Take a given string and a data object and find/replace all the keys within it
helpers.interpolate = (str, data) => {
    str = typeof(str) == 'string' && str.length > 0 ? str : '';
    data = typeof(data) == 'object' && data !== null ? data : {};

    // Add the templateGlobals to the data object, prepending their key name with "global"
    for (const keyName in config.templateGlobals) {
        if (config.templateGlobals.hasOwnProperty(keyName)) {
            data['global.' + keyName] = config.templateGlobals[keyName];
        }
    }

    // For each key in the data object, insert its value into the string at the corresponding
    for (const key in data) {
        if (data.hasOwnProperty(key) && typeof(data[key]) == 'string') {
            const replace = data[key];
            const find = `{${key}}`;
            str = str.replace(find, replace);
        }
    }

    return str;
};

// Get the content of a static (public) asset
helpers.getStaticAsset = fileName => 
    new Promise((resolve, reject) => {
        fileName = typeof(fileName) == 'stirng' && fileName.length > 0 ? fileName: false;
        if (fileName) {
            const publicDir = path.join(__dirname, '/../public/');
            fs.readFile(publicDir+fileName, (err, data) => {
                if (!err && data) {
                    resolve(data);
                } else {
                    reject('No file could be found');        
                }
            })
        } else {
            reject('A valid file name was not specified');
        }
    });

// Export the module
module.exports = helpers;
