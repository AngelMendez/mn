/**
 * Helpers for various tasks
 */

// Dependencies
const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');
const path = require('path');
const fsAsync = require('../asyncs/fs.async');
const httpsAsync = require('../asyncs/https.async');

const config = require('./config');

// Container for all the helpers
let helpers = {};

/**
 * Hash a value using sha256 cryptographic method.
 *
 * @param {String} str
 *  Value to hash.
 */
helpers.hash = str => {
    if (typeof(str) == 'string' && str.length > 0) {
        const hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
        return hash;
    } else {
        return false;
    }
};

/**
 * Parse a JSON string to an object in all cases, without throwing
 * @param {string} str
 * Json string
 */
helpers.parseJsonToObject = str => {
    try {
        const obj = JSON.parse(str);
        return obj;
    } catch (e) {
        return {};
    }
}

/**
 * Create a string of random alphanumeric characters, of a given length
 * @param {string} strLength 
 * The length required for the string
 */
helpers.createRandomString = strLength => {
    strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;
    if (strLength) {
        // Define all the possible characters that could go into a string
        const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

        let str = '';
        while(str.length < strLength) {
            str = str.concat(possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length)));
        }
        return str;
    } else {
        return false;
    }
};

/**
 * Send an SMS message via config.twilio
 * @param {string} phone
 * Phone to with the message will be sent, has to be 10 chars long
 * @param {string} message
 * Message to be sent in the SMS
 */
helpers.sendTwilioSMS = async (phone, message) => {
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
        const req = await httpsAsync.request(requestDetails)
            .then(res => {
                // Grab the status of the sent request
                const { statusCode } = res;
                
                // Callback successfully if the request went through
                if (statusCode == 200 || statusCode == 201) {
                    return {
                        statusCode,
                    }
                } else {
                    return {
                        statusCode,
                        error: 'Status code returned was ' + statusCode,
                    }
                }
        });
        
        // bind to the error event so it does not get thrown
        req.on('error', err => {
            return {
                statusCode: 500,
                error: err,
            }
        });
        
        // Add the payload
        req.write(stringPayload);
        
        // End the request
        req.end();
        
    } else {
        return {
            statusCode: 400,
            error: 'Given parameters were missing or invalid.',
        }
    }
};


/**
 * Get the string content of a template
 * @param { string } templateName The name of the template
 * @param { object } data The values to be interpolated in the template
 */
helpers.getTemplate = async (templateName, data) => {
    templateName = typeof(templateName) == 'string' && templateName.length > 0 ? templateName : false;
    data = typeof(data) == 'object' && data !== null ? data : {};

    if (templateName) {
        const templatesDir = path.join(__dirname, '/../templates/');
        const str =  await fsAsync.readFile(`${templatesDir}${templateName}.html`, 'utf8');
        if (str && str.length > 0) {
            // Do interpolation on the string
            const finalString = helpers.interpolate(str, data);
            return {
                payload: finalString,
            }
        } else {
            return {
                error: 'No template could be found.',
            }
        }
    } else {
        return {
            error: 'A valid template name was not specified.',
        }
    }
};

/**
 * Add the universal header and footer to a string, and pass provided data object to header and footer to interpolation
 * @param { string } str The HTML string to be added between the header and the footer.
 * @param { object } data Data to be interpolated in the template.
 */
helpers.addUniversalTemplates = async (str, data) => {
    str = typeof(str) == 'string' && str.length > 0 ? str : '';
    data = typeof(data) == 'object' && data !== null ? data : {};

    // Get the header
    const { payload: headerString } = await helpers.getTemplate('_header', data);
    const { payload: footerString } = await helpers.getTemplate('_footer', data);
    if (!headerString || !footerString) {
        return {
            error: 'Could not find one or more templates.',
        }
    }
    const fullString = headerString + str + footerString;
    return {
        payload: fullString,
    }           
};

/**
 * Take a given string and a data object and find/replace all the keys within it
 * @param { string } str The value to search
 * @param { object } data 
 */
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

/**
 * Get the content of a static (public) asset
 * @param { string } fileName The name of the file to get
 */
helpers.getStaticAsset = async fileName => {
    fileName = typeof(fileName) == 'string' && fileName.length > 0 ? fileName: false;
    if (fileName) {
        const publicDir = path.join(__dirname, '/../public/');
        const data = await fsAsync.readFile(publicDir+fileName);
        if (data) {
            return {
                payload: data,
            }
        } else {
            return {
                error: 'No file could be found.',
            }
        }
    } else {
        return {
            error: 'A valid file name was not specified.',
        }
    }
};

// Export the module
module.exports = helpers;
