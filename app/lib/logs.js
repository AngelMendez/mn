/**
 * Library for storing and rotating logs
 */

// Dependencies
const path = require('path');
const zlib = require('zlib');

const fsAsync = require('../asyncs/fs.async');

// Container for the module
let lib = {};

lib.baseDir = path.join(__dirname, '/../.logs/');

// Append a string to a file. Create the file if it does not exist.
lib.append = async (file, str) => {
    // Open the file for appending
    try {
        const fileDescriptor = await fsAsync.open(`${lib.baseDir}${file}.log`, 'a');
        const isAppendedFile = await fsAsync.appendFile(fileDescriptor, `${str}\n`);
        const isClosed = await fsAsync.close(fileDescriptor);
        return true;
    } catch (error) {
        return {
            error,
        }
    }
}

// List all the logs, and optionally include the compressed logs
lib.list = async includeCompressedLogs => {
    try {
        const data = await fsAsync.readdir(lib.baseDir);
        if (data.length > 0) {
            let trimmedFileNames = [];
            data.forEach(fileName => {
                // Add the .log files
                if (fileName.indexOf('.log') > -1) {
                    trimmedFileNames.push(fileName.replace('.log', ''));
                }
                
                // Add on th .gz files
                if (fileName.indexOf('.gz.b64') > -1 && includeCompressedLogs) {
                    trimmedFileNames.push(fileName.replace('.gz.b64'), '');
                }
            });
            return {
                payload: trimmedFileNames,
            };
        }
        else {
            return {
                payload: data,
            }
        }
    } catch (error) {
        return {
            statusCode: 500,
            error,
        }
    }
};

// Compress the contents of one .log file into a .gz.b64 file within the same directory
lib.compress = async (logId, newFileId) => {
    const sourceFile = `${logId}.log`;
    const destFile = `${newFileId}.gz.b64`;
    
    // Read the source file
    try {
        const inputString = await fsAsync.readFile(`${lib.baseDir}${sourceFile}`, 'utf-8');
        zlib.gzip(inputString, async (error, buffer) => {
            if (!error && buffer) {
                // Send the data to the destination file.
                const fileDescriptor = await fsAsync.open(`${lib.baseDir}${destFile}`, 'wx');
                // Write to the destination file.
                const isWrittenFile = await fsAsync.writeFile(fileDescriptor, buffer.toString('base64'));
                // Close the file.
                const isClosed = await fsAsync.close(fileDescriptor);
                return true;
            } else {
                return {
                    statusCode: 500,
                    error,
                }
            }
        });
    } catch (error) {
        return {
            statusCode: 500,
            error,
        };
    }
};

// Decompress the content of a .gz.b64 file into a string variable
lib.decompress = async fileId => {
    const fileName = `${fileId}.gz.b64`;
    try {        
        const str = await fsAsync.readFile(lib.baseDir+fileName, 'utf-8');
        // Decompress the data
        const inputBuffer = Buffer.from(str, 'base64');
        zlib.unzip(inputBuffer, (error, outputBuffer) => {
            if (!err && outputBuffer) {
                const outputBufferString = outputBuffer.toString();
                return true;
            } else {
                return {
                    statusCode: 500,
                    error,
                }
            }
        });
    } catch (error) {
        return {
            statusCode: 500,
            error,
        }
    }
};

lib.truncate = async logId => {
    try {
        const isTruncated = await fsAsync.truncate(lib.baseDir + logId + '.log', 0);
        return true;
    } catch (error) {
        return {
            statusCode: 500,
            error,
        }
    }
};

// Export the module
module.exports = lib;
