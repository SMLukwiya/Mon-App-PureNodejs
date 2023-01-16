/**
 * Frontend Logic
 */

let app = {};

// Config
app.config = {
    sessionToken: false
};

// client API
app.client = {
    request: function (headers, path, method, queryStringObject, payload, callback) {
        // Set default
        headers = typeof(headers) == 'object' && headers !== null ? headers : {};
        path = typeof(path) == 'string' ? path : '/';
        method = typeof(method) == 'string' && ['POST', 'GET', 'PUT', 'DELETE'].indexOf(method) > -1 ? method.toUpperCase() : 'GET';
        queryStringObject = typeof(queryStringObject) == 'object' && queryStringObject !== null ? queryStringObject : {};
        payload = typeof(payload) == 'object' && payload !== null ? payload : {};
        callback = typeof(callback) == 'function' ? callback : false;

        // For each query string parameter received, add it to the path
        let requestUrl = path + '?';
        let counter = 0;

        for (let queryKey in queryStringObject) {
            if (queryStringObject.hasOwnProperty(queryKey)) {
                counter++;
                // If a query string has already been added, prepend new keys with ampersand(&)
                if (counter > 1) {
                    requestUrl += '&';
                }

                // Add keyvalue
                requestUrl += queryKey + '=' + queryStringObject[queryKey];
            }
        }

        // Append fetch headers
        let fetchHeader = new Headers();
        fetchHeader.append('Content-Type', 'application/json');

        // Loop and add headers to fetch headers
        for (let headerKey in headers) {
            if (headers.hasOwnProperty(headerKey)) {
                fetchHeader.append(headerKey, headers[headerKey]);
            }
        }

        // If session token exists, add to fetch headers
        if (app.config.sessionToken) {
            fetchHeader.append('token', app.config.sessionToken.id)
        }

        // Form http request (use fetch api)
        fetch(requestUrl, {
            method,
            headers,
            mode: 'cors',
            body: method !== 'GET' ? JSON.stringify(payload) : null
        })
        .then(response => {
            let statusCode = response.status;
            const responsePromise = response.json();
            responsePromise.then(data => {
                // Callback if requested
                if (callback) {
                    callback(statusCode, data);
                }
            })
        })
        .catch(err => {
            console.log(err);
            if (callback) {
                callback(statusCode, false)
            }
        })

    }
}