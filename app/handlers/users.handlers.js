/**
 * Request handlers for User
 */

// Dependencies
const _data = require('../lib/data');
const helpers = require('../lib/helpers');
const config = require('../lib/config');
const tokensHandlers = require('./tokens.handlers');

// Define the user handlers container
let userHandlers = {};

/**
 * Create a new User
 * @param { object } data Container of the user data
 */
userHandlers.post = async data => {
    // Check that all required fiels are filled out
    const firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    const lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    const tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;
    
    if (firstName && lastName && phone && password && tosAgreement) {
        const test = await _data.read('users', phone);
        if (!test) {
            // Hash the password
            const hashedPassword = helpers.hash(password);
            
            // Create the user object
            if (hashedPassword) {
                const userObject = {
                    'firstName': firstName,
                    'lastName': lastName,
                    'phone': phone,
                    'hashedPassword': hashedPassword,
                    'tosAgreement': true,
                };
                const { statusCode, payload, error} = await _data.create('users', phone, userObject);
                if (!error) {
                    delete payload.hashedPassword;
                    return {
                        statusCode,
                        payload,
                    };
                } else {
                    return {
                        statusCode: 500, 
                        error: 'Could not create the new user.',
                    };
                }
            } else {
                return {
                    statusCode: 500,
                    error: 'Could not hash the users password.',
                };
            }
        } else {
            // User already exists
            return {
                statusCode: 400,
                error: 'A user with that phone number already exists.',
            };
        }
    } else {
        return {
            statusCode: 400,
            error: 'Missing required fields',
        };
    }
};

/**
 * Get the user information related to a user phone
 * @param { object } data Container with the user phone
 */
userHandlers.get = async data => {
    // Check that the phone number is valid
    const phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if (phone) {
        // Get the token from the headers
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        
        // Verify that the given token is valid for the phone number
        const tokenIsValid = await tokensHandlers.verifyToken(token, phone);
        if (tokenIsValid) {
            const userData = await _data.read('users', phone);
            if (userData) {
                // Remove the hashed password from the user object before returning it to the requestor
                delete userData.hashedPassword;
                return {
                    statusCode: 200,
                    payload: userData,
                };
            } else {
                return {
                    statusCode: 404,
                    error: 'User not found',
                };
            }
        } else {
            return {
                statusCode: 403,
                error: 'Missing required token in header, or token is invalid.',
            };
        }
    } else {
        return {
            statusCode: 400,
            error: 'Missing required field',
        };
    }
};

/**
 * Update the given user with the given data.
 * @param { object } data Container with the data to update the user.
 */
userHandlers.put = async data => {
    // Check for the required filed
    const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    
    // Check for the optional fields
    const firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    const lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    
    // Error if phone is invalid
    if (phone) {
        // Error is nothing is sent to update
        if (firstName || lastName || password) {
            // Get the token from the headers
            const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

            // Verify that the given token is valid for the phone number
            const tokenIsValid = await tokensHandlers.verifyToken(token, phone);
            if (tokenIsValid) {
                const userData = await _data.read('users', phone);
                if (userData) {
                    // Update the fields necessary
                    if (firstName) {
                        userData.firstName = firstName;
                    }
                    if (lastName) {
                        userData.lastName = lastName;
                    }
                    if (password) {
                        userData.hashedPassword = helpers.hash(password);
                    }
                    
                    const { payload, error } = await _data.update('users', phone, userData);
                    if (!error) {
                        return {
                            statusCode: 200,
                            payload,
                        };
                    } else {
                        return {
                            statusCode: 500,
                            error: 'Could not update the user',
                        };
                    }
                } else {
                    return {
                        statusCode: 400,
                        error: 'The specified user does not exist.',
                    };
                }
            } else {
                return {
                    statusCode: 403,
                    error: 'Missing required token in header, or token is invalid.',
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
            error: 'Missing required fields',
        };
    }
};

/**
 * Delete the given user.
 * @param { object } data Container with the data to delete the user.
 * @returns Status Code and error if the case.
 */
userHandlers.delete = async data => {
    // Check that the phone number is valid
    const phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if (phone) {
        // Get the token from the headers
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        
        // Verify that the given token is valid for the phone number
        const tokenIsValid = await tokensHandlers.verifyToken(token, phone);
        if (tokenIsValid) {
            const userData = await _data.read('users', phone);
            if (userData) {
                const userDeleted = await _data.delete('users', phone);
                if (userDeleted) {
                    // Delete each of the checks associated with the user
                    const userChecks = typeof(userData.checks) == 'object' && (userData.checks instanceof Array) ? userData.checks : [];
                    const checksToDelete = userChecks.length;
                    if (checksToDelete > 0) {
                        let checksDeleted = 0;
                        let deletionErrors = false;
                        
                        // Loop through the checks
                        userChecks.map(async checkId => {
                            const checkDeleted = await _data.delete('checks', checkId);
                            if (!checkDeleted) {
                                deletionErrors = true;
                            }
                            checksDeleted++;
                            if (checksDeleted == checksToDelete) {
                                if(!deletionErrors) {
                                    return {
                                        statusCode: 200,
                                    }
                                } else {
                                    return {
                                        statusCode: 500,
                                        error: 'Errors encountered while attempting to delete all of the user\'s checks. All checks may not have been deleted from the system successfully',
                                    };
                                }
                            }
                        })
                    } else {
                        return {
                            statusCode: 200,
                        }
                    }
                } else {
                    return {
                        statusCode: 500,
                        error: 'Could not delete the specified user',
                    };
                }
            } else {
                return {
                    statusCode: 400,
                    error: 'Could not find the specified user.',
                };
            }
        } else {
            return {
                statusCode: 403,
                error: 'Missing required token in header, or token is invalid.',
            };
        }
    } else {
        return {
            statusCode: 400,
            error: 'Missing required field',
        };
    }
};

module.exports = userHandlers;
