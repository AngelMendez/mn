/**
 * Request handlers for Tokens
*/

 // Dependencies
 const _data = require('../lib/data');
 const helpers = require('../lib/helpers');

let tokensHandlers = {};

/**
 * Verify that the token sent in the Authorization is valid
 * @param { string } id The id sent in the request
 * @param { string } phone Phone of the user
 */
tokensHandlers.verifyToken = async (id, phone) => {
    const tokenData = await _data.read('tokens', id);
    if (tokenData) {
        // Check that the token is for the given user and has not expired
        if (tokenData.phone == phone && tokenData.expires > Date.now()) {
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
};

/**
 * Create a token (session)
 * @param { object } data Object containing the phone and password of the user
 */
tokensHandlers.post = async data => {
    const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if (phone && password) {
        const userData = await _data.read('users', phone);
        if (userData) {
            // Hash the sent password, and compare it to the password stored in the user object
            const hashedPassword = helpers.hash(password);
            if (hashedPassword == userData.hashedPassword) {
                // If valid, create a new token with a random name. Set expiration date 1 hour in the future.
                const tokenId = helpers.createRandomString(20);
                const expires = Date.now() + 1000 * 60 * 60;
                const tokenObject = {
                    'phone': phone,
                    'id': tokenId,
                    'expires': expires,
                };

                const { statusCode, payload, error } = await _data.create('tokens', tokenId, tokenObject);
                if (!error) {
                    return {
                        statusCode,
                        payload,
                    };
                } else {
                    return {
                        statusCode: 500,
                        error: "Could not create the new token. ",
                    };
                }
            } else {
                return {
                    statusCode: 400,
                    error: 'Password did not match the specified user\'s stored password',
                };
            }
        } else {
            return {
                statusCode: 400,
                error: 'Could not find the specified user.',
            };
        }
    } else {
        return{
            statusCode: 400,
            error: 'Missing required fields.',
        };
    }
};

tokensHandlers.get = async data => {
    // Check that the id is valid
    const id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if (id) {
        const tokenData = await _data.read('tokens', id);
        if (tokenData) {
            return {
                statusCode: 200,
                payload: tokenData,
            } 
        } else {
            return {
                statusCode: 404,
                error: 'Token not found.',
            };
        }
    } else {
        return {
            statusCode: 400,
            error: 'Missing required field',
        };
    }
};

tokensHandlers.put = async data => {
    const id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
    const extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;

    if (id && extend) {
        let tokenData = await _data.read('tokens', id);
        if (tokenData) {
            // Check to the make sure the token isn't already expired
            if (tokenData.expires > Date.now()) {
                // Set the expiration an hour from now
                tokenData.expires = Date.now() + 1000 * 60 * 60;

                const { statusCode, payload, error } = await _data.update('tokens', id, tokenData);
                if (!error) {
                    return {
                        statusCode,
                        payload,
                    }
                } else {
                    return {
                        statusCode: 500,
                        error,
                    };
                }
            } else {
                return {
                    statusCode: 400,
                    error: 'The token has already expired, and cannot be extended.',
                };
            }
        } else {
            return {
                statusCode: 400,
                error: 'Specified token does not exist',
            };
        }
    } else {
        return {
            statusCode: 400,
            error: 'Missing required field(s) or field(s) are invalid',
        };
    };
};

tokensHandlers.delete = async data => {
    // Check that the id is valid
    const id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if (id) {
        const tokenData = await _data.read('tokens', id);
        if (tokenData) {
            const tokenDeleted = await _data.delete('tokens', id);
            if (tokenDeleted) {
                return {
                    statusCode: 200,
                };
            } else {
                return {
                    statusCode: 500,
                    error: 'Could not delete the specified token',
                };
            }
        } else {
            return {
                statusCode: 404,
                error: 'Could not find the specified token.',
            };
        }
    } else {
        return {
            statusCode: 400,
            error: 'Missing required field',
        };
    }
};

module.exports = tokensHandlers;
