/**
 * Request handlers for Checks
*/

// Dependencies
const _data = require('../lib/data');
const fsAsync = require('../asyncs/fs.async');
const helpers = require('../lib/helpers');
const config = require('./../lib/config');
const tokensHandlers = require('./tokens.handlers');

let checksHandlers = {};

checksHandlers.post = async data => {
    // Validate inputs
    const protocol = typeof(data.payload.protocol) == 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    const url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    const method = typeof(data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    const successCodes = typeof(data.payload.successCodes) == 'object' && (data.payload.successCodes instanceof Array) && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    const timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    if (protocol && url && method && successCodes && timeoutSeconds) {
        // Get the token from the headers
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        const tokenData = await _data.read('tokens', token);
        if (tokenData) {
            const userPhone = tokenData.phone;

            const userData = await _data.read('users', userPhone);
            if (userData) {
                const userChecks = typeof(userData.checks) == 'object' && (userData.checks instanceof Array) ? userData.checks : [];

                // Verify that the user has less than the number of max-checks-per-user
                if (userChecks.length < config.maxChecks) {
                    // Create a random id for the check
                    const checkId = helpers.createRandomString(20);

                    // Create the check object, and include the user's phone
                    const checkObject = {
                        'id': checkId,
                        'userPhone': userPhone,
                        'protocol': protocol,
                        'url': url,
                        'method': method,
                        'successCodes': successCodes,
                        'timeoutSeconds': timeoutSeconds,
                    };

                    const { error } = await _data.create('checks', checkId, checkObject);
                    if (!error) {
                        // Add the check id to the user's object
                        userData.checks = userChecks;
                        userData.checks.push(checkId);

                        const updatedUser = await _data.update('users', userPhone, userData);
                        if (updatedUser) {
                            // Return the data about the new check
                            return {
                                statusCode: 200,
                                payload: checkObject,
                            };
                        } else {
                            return {
                                statusCode: 500,
                                error: 'Could not update the user with the new check.',
                            };
                        }
                    } else {
                        return {
                            statusCode: 500,
                            error: 'Could not create the new check.',
                        };
                    }
                } else {
                    return {
                        statusCode: 400,
                        error: 'The user already has the maximum number of checks (' + config.maxChecks + ').',
                    };
                }
            } else {
                return {
                    statusCode: 403,
                    error: 'Could not read the user info.',
                };
            }
        } else {
            return {
                statusCode: 403,
                error: 'Could not read the token info.',
            };
        }
    } else {
        return {
            statusCode: 400,
            error: 'Missing required inputs, or inputs are invalid',
        };
    }
};

checksHandlers.get = async data => {
    // Check that the phone number is valid
    const id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if (id) {
        const checkData = await _data.read('checks', id);
        if (checkData) {
            // Get the token from the headers
            const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

            // Verify that the given token is valid and belongs to the user who created the check
            const tokenIsValid = await tokensHandlers.verifyToken(token, checkData.userPhone);
            if (tokenIsValid) {
                // Return the check data
                return {
                    statusCode: 200,
                    payload: checkData,
                };
            } else {
                return {
                    statusCode: 403,
                    error: 'Token is not valid.',
                };
            }
        } else {
            return {
                statusCode: 404,
                error: 'Check data not found.',
            };
        }
    } else {
        return {
            statusCode: 400,
            error: 'Missing required field',
        };
    }
};

checksHandlers.put = async data => {
    // Check for the required filed
    const id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;

    // Check for the optional fields
    const protocol = typeof(data.payload.protocol) == 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    const url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    const method = typeof(data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    const successCodes = typeof(data.payload.successCodes) == 'object' && (data.payload.successCodes instanceof Array) && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    const timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false

    // Check to make sure the id is valid
    if (id) {
        // Check to make sure one or more optional fields has been sent
        if (protocol || url || method || successCodes || timeoutSeconds) {
            const checkData = await _data.read('checks', id);
            if (checkData) {
                // Get the token from the headers
                const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                // Verify that the given token is valid and belongs to the user who created the check
                const tokenIsValid = await tokensHandlers.verifyToken(token, checkData.userPhone);
                if (tokenIsValid) {
                    // Update the check where necessary
                    if (protocol) {
                        checkData.protocol = protocol;
                    }
                    if (url) {
                        checkData.url = url;
                    }
                    if (method) {
                        checkData.method = method;
                    }
                    if (successCodes) {
                        checkData.successCodes = successCodes;
                    }
                    if (timeoutSeconds) {
                        checkData.timeoutSeconds = timeoutSeconds;
                    }

                    const updatedCheck = await _data.update('checks', id, checkData);
                    if(updatedCheck) {
                        return {
                            statusCode: 200,
                            payload: updatedCheck,
                        };
                    } else {
                        return {
                            statusCode: 500,
                            error: 'Could not update the check.',
                        };
                    }
                } else {
                    return {
                        statusCode: 403,
                    };
                }
            } else {
                return {
                    statusCode: 400,
                    error: 'Check ID did not exist.',
                };
            }
        } else {
            return {
                statusCode: 400,
                error: 'Missing fields to update',
            };
        }
    } else {
        return {
            statusCode: 400,
            error: 'Missing required field',
        };
    }
};

checksHandlers.delete = async data => {
    // Check that the id is valid
    const id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    
    if (id) {
        const checkData = await _data.read('checks', id);
        if (checkData) {
            // Get the token from the headers
            const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
            
            // Verify that the given token is valid for the phone number
            const tokenIsValid = await tokensHandlers.verifyToken(token, checkData.userPhone);
            if (tokenIsValid) {
                
                const checkDeleted = await _data.delete('checks', id);
                if (checkDeleted) {
                    
                    const userData = await _data.read('users', checkData.userPhone);
                    if (userData) {
                        const userChecks = typeof(userData.checks) == 'object' && (userData.checks instanceof Array) ? userData.checks : [];
                        
                        // Remove the deleted check from thei list of checks
                        const checkPosition = userChecks.indexOf(id);
                        if (checkPosition > -1) {
                            userChecks.splice(checkPosition, 1);
                            
                            const { statusCode, payload, error } = await _data.update('users', checkData.userPhone, userData);
                            if (!error) {
                                return {
                                    statusCode:200,
                                };
                            } else {
                                return {
                                    statusCode: 500, 
                                    error: 'Could not update the user',
                                };
                            }
                        } else {
                            return {
                                statusCode: 500, 
                                error: 'Could not find the check on the users object, so could not remove it',
                            };
                        }
                    } else {
                        return {
                            statusCode: 500,
                            error: 'Could not find the user who created the check, so could not remove the check from the user object.',
                        };
                    }
                } else {
                    return {
                        statusCode: 500,
                        error: 'Could not delete check data.',
                    };
                }
            } else {
                return {
                    statusCode: 403,
                };
            }
        } else {
            return {
                statusCode: 400,
                error: 'The specified check ID does not exist.',
            };
        }
    } else {
        return {
            statusCode: 400,
            error: 'Missing required field',
        };
    }
};

module.exports = checksHandlers;
