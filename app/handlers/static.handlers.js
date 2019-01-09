/**
 * Request handlers for static assets
*/

// Dependencies
const helpers = require('./../lib/helpers');

let staticHandlers = {};

// HTML Handlers
staticHandlers.index = async data => {
    // Reject any request that is not a GET
    if (data.method == 'get') {
        // Prepare data for interpolation
        const templateData = {
            'head.title': 'This is the title',
            'head.description': 'This is the meta description',
            'body.title': 'Hello templated world!',
            'body.class': 'index',
        };
    
        const { payload: str } = await helpers.getTemplate('index', templateData);
        if (str) {
            const { payload: templatedStr } = await helpers.addUniversalTemplates(str, templateData);
            if (templatedStr) {
                return {
                    statusCode: 200,
                    payload: templatedStr, 
                    contentType: 'html',
                }
            } else {
                return {
                    statusCode: 500,
                    payload: undefined,
                    contentType: 'html',
                }
            }
        } else {
            return {
                statusCode: 500,
                payload: undefined,
                contentType: 'html',
            }
        }
    } else {
        return {
            statusCode: 405,
            payload: undefined,
            contentType: 'html',
        };
    }
};

staticHandlers.favicon = async data => {
    if (data.method == 'get') {
        const { payload: favicon } = await helpers.getStaticAsset('favicon.ico');
        if (favicon) {
            return {
                statusCode: 200,
                payload: favicon,
                contentType: 'favicon',
            }
        } else {
            return {
                statusCode: 500,
                error: 'Favicon not found.',
            }
        }
    } else {
        return {
            statusCode: 405,
            error: 'Method not allowed.',
        }
    }
};

// Public Assets
staticHandlers.public = async data => {
    if (data.method == 'get') {
        // Get the filename being requested
        const trimmedAssetName = data.trimmedPath.replace('public/', '').trim();
        if (trimmedAssetName.length > 0) {
            const data = await helpers.getStaticAsset(trimmedAssetName);
            if (data) {
                // Determine the content type (default to plain text)
                let contentType = 'plan';
                if (trimmedAssetName.index('.css') > -1) {
                    contentType = 'css';
                }
                if (trimmedAssetName.index('.png') > -1) {
                    contentType = 'png';
                }
                if (trimmedAssetName.index('.jpg') > -1) {
                    contentType = 'jpg';
                }
                if (trimmedAssetName.index('.ico') > -1) {
                    contentType = 'favicon';
                }
                return {
                    statusCode: 200,
                    payload: data,
                    contentType,
                }
            } else {
                return {
                    statusCode: 404,
                    error: 'Asset not found.',
                }
            }
        } else {
            return {
                statusCode: 404,
                error: 'Asset not found.',
            }
        }
    } else {
        return {
            statusCode: 405,
            error: 'Method not allowed.',
        }
    }
};

module.exports = staticHandlers;
