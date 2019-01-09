// Worker-related tasks

// Dependencies
const path = require('path');
const fs = require('fs');
const _data = require('./data');
const httpAsync = require('../asyncs/http.async');
const httpsAsync = require('../asyncs/https.async');
const helpers = require('./helpers');
const url = require('url');
const _logs = require('./logs');
const util = require('util');
const debug = util.debuglog('workers');

let workers = {};

// Lookup all checks, get their data, send to a validator
workers.gatherAllChecks = async () => {
    // Get all the checks
    const checks = await _data.list('checks');
    if (checks.length > 0) {
        checks.map(async check => {
            const originalCheckData = await _data.read('checks', check);
            // Pass it to the check validator, and let that function continue or log errors as needed
            await workers.validateCheckData(originalCheckData);
        })
    } else {
        debug("Error: Could not find any checks to process");
    }
};

// Sanity-check the check-data
workers.validateCheckData = async originalCheckData => {
    originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData !== null ? originalCheckData : {};
    originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id.trim() : false;
    originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 10 ? originalCheckData.userPhone.trim() : false;
    originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['https', 'http'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false;
    originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false;
    originalCheckData.method = typeof(originalCheckData.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false;
    originalCheckData.successCodes = typeof(originalCheckData.successCodes) == 'object' && (originalCheckData.successCodes instanceof Array) && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
    originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;

    // Set the keys that may not be set (if the workers have never seen this check before)
    originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up', 'down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down';
    originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;

    // If all the checkcs pas, pass the data along to the next step in the process
    if (originalCheckData.id && 
        originalCheckData.userPhone &&
        originalCheckData.protocol &&
        originalCheckData.url &&
        originalCheckData.userPhone &&
        originalCheckData.method &&
        originalCheckData.successCodes &&
        originalCheckData.timeoutSeconds
    ) {
        await workers.performCheck(originalCheckData);
    } else {
        debug("Error: One of the checks is not properly formatted. Skipping it.");
    }
};

// Perform the check, send the originalCheckData and the outcome of the check process, to the next step in the processe
workers.performCheck = async originalCheckData => {
    // Prepare the initial check outcome
    let checkOutcome = {
        'error': false,
        'responseCode': false,
    };

    // Mark that the outcome has not been sent yet
    let outcomeSent = false;

    // Parse the hostname and the path out of the original check data
    const parsedUrl = url.parse(originalCheckData.protocol + '://' + originalCheckData.url, true);
    const hostName = parsedUrl.hostname;
    const path = parsedUrl.path; // Using path and not 'pathname' because we want the queryString

    const requestDetails = {
        'protocol': originalCheckData.protocol + ':',
        'hostname': hostName,
        'method': originalCheckData.method.toUpperCase(),
        'path': path,
        'timeout': originalCheckData.timeoutSeconds * 1000,
    };

    // Instantiate the request object (using either the http or https module)
    const _moduleToUse = originalCheckData.protocol == 'http' ? httpAsync : httpsAsync;
    const req = await _moduleToUse.request(requestDetails)
        .then(async res => {
            // Grab the status of the sent request
            const status = res.statusCode;

            // Update the checkoutcome and pass the data along
            checkOutcome.responseCode = status;
            if (!outcomeSent) {
                await workers.processCheckOutcome(originalCheckData, checkOutcome);
                outcomeSent = true;
            }
    });

    // Bind to the error event so it does not get thrown
    req.on('error', async (error) => {
        // Update the checkOutcome and pass the data along
        checkOutcome.error = {
            'error': true,
            'value': error,
        };
        if (!outcomeSent) {
            await workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    // Bind to the timeout event
    req.on('timeout', async (error) => {
        // Update the checkOutcome and pass the data along
        checkOutcome.error = {
            'error': true,
            'value': 'timeout',
        };
        if (!outcomeSent) {
            await workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    // End the request
    req.end();
};

// Process the check outcome, update the check data as needed, trigger an alert if needed
// Special logic for accomodation a check that has never been tested before (don't alert on that one)
workers.processCheckOutcome = async (originalCheckData, checkOutcome) => {
    // Decide if the check is considered up or down
    const state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';

    // Decide if an alert is warranted
    const alertWanted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

    // Log the outcome
    const timeOfCheck = Date.now();
    await workers.log(originalCheckData, checkOutcome, state, alertWanted, timeOfCheck);

    // Update the check data
    const newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = timeOfCheck;

    // Save the updates
    const { statusCode, payload, error } = await _data.update('checks', newCheckData.id, newCheckData);
    if (!error) {
        // Send the new check data to the next phase in the process if needed
        if (alertWanted) {
            await workers.alertUserToStatusChange(newCheckData);
        } else {
            debug('Check outcome has not changed, no alert needed.');
        }
    } else {
        debug("Error trying to save updated to one of the checks.");
    }
};

// Alert the user as to ac hange in their check status
workers.alertUserToStatusChange = async newCheckData => {
    const message = `Alert, Your check for ${newCheckData.method.toUpperCase()} ${newCheckData.protocol}://${newCheckData.url} is currently ${newCheckData.state}`;
    const { statusCode, error} = await helpers.sendTwilioSMS(newCheckData.userPhone, message);
    if (!error) {
        debug('Success: User was alerted to a status change in their check, via SMS.', message);
    } else {
        debug('Error: Could not send sms alert to user who had a state change in their check. ' + statusCode);
    }
};

workers.log = async (originalCheckData, checkOutcome, state, alertWanted, timeOfCheck) => {
    // Form the log data
    const logData = {
        'check': originalCheckData,
        'outcome': checkOutcome,
        'state': state,
        'alerts': alertWanted,
        'time': timeOfCheck,
    }

    // Convert to a string
    const logString = JSON.stringify(logData);

    // Determine the name of the log file
    const logFileName = originalCheckData.id;

    // Append the log string to the file
    const { error } = await _logs.append(logFileName, logString);
    if (!error) {
        debug('Logging to file succeeded');
    } else {
        debug('Logging to file failed');
    }
};

// Timer to execute the worker-process once per minute
workers.loop = () => {
    setInterval(() => {
        workers.gatherAllChecks();
    }, 1000 * 60);
};

// Rotate (compress) the log files
workers.rotateLogs = async () => {
    // List all the (non compressed) log files
    let { payload: logs, error } = await _logs.list(false);
    if (!error && logs && logs.length > 0) {
        logs.map(async logName => {
            // Compress the data to a different file
            const logId = logName.replace('.log', '');
            const newFileId = `${logId}-${Date.now()}`;
            let { error } = await _logs.compress(logId, newFileId);
            if (!error) {
                // Truncate the log
                let { error } = await _logs.truncate(logId);
                if (!error) {
                    debug("Success truncating logFile");
                } else {
                    debug("Error truncating logFile");
                }
            } else {
                debug("Error: Compressing one of the log files", error);            
            }
            });
    } else {
        debug("Error: Could not find any logs to rotate");
    }
};

// Timer to execute the log-rotation once per day
workers.logRotationLoop = async () => {
    setInterval(async () => {
        await workers.rotateLogs();
    }, 1000 * 60 * 60 * 24);
};

workers.init = () => {
    // Send to console, in yellow
    console.log('\x1b[33m%s\x1b[0m', 'Background workers are running');

    // Execute all the checks immediately
    workers.gatherAllChecks();

    // Call the loop so the checks will execute later on
    workers.loop();

    // Compress all the logs immediatyle
    workers.rotateLogs();

    // Call the compression loop so logs will be compressed later on
    workers.logRotationLoop();
};

module.exports = workers;
