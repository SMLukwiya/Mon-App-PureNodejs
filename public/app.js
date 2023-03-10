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
            headers: fetchHeader,
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

// Bind logout button
app.bindLogoutButton = function () {
    document.getElementById('logoutButton').addEventListener('click', (e) => {
        // Stop default redirect behaviour
        e.preventDefault();
    
        // Logout user
        app.logUserOut()
    })
}


// Logout user then redirect them
app.logUserOut = function () {
    // Get the current token id
    let tokenId = typeof(app.config.sessionToken.id) == 'string' ? app.config.sessionToken.id : false;

    // Delete current token from tokens 
    let queryStringObject = {
        id: tokenId
    }
    app.client.request(undefined, 'api/tokens', 'DELETE', queryStringObject, undefined, (code, response) => {
        // Remove app.config token
        app.setSessionToken(false);

        // Send the user to logged out page
        window.location = '/session/deleted';
    })
}

app.bindForms = function () {
    if (document.querySelector("form")) {
        document.querySelector('form').addEventListener('submit', function (e) {

            // Prevent form from submitting
            e.preventDefault();
            let formId = this.id;
            let path = this.action;
            let method = this.method.toUpperCase();
            
            if (['accountEdit1', 'accountEdit2'].indexOf(formId) > -1) {
                console.log(method)    
                method = 'PUT'
            }

            if (formId == 'accountEdit3') {
                method = 'DELETE'
            }
    
            // Hide error message (if it's the previous error)
            document.querySelector(`#${formId} .formError`).style.display = 'hidden';
    
            // Change form inputs into payload
            let payload = {};
            let elements = this.elements;
            for (let i = 0; i < elements.length; i++) {
                if (elements[i].type !== 'submit') {
                    let valueOfElement = elements[i].type == 'checkbox' ? elements[i].checked : elements[i].value;
                    payload[elements[i].name] = valueOfElement;
                }
            }
    
            // Call the API
            app.client.request(undefined, path, method, undefined, payload, (statusCode, responsePayload) => {
                if (statusCode !== 200) {
                    // Get error from the api or set default error message
                    let error = typeof(responsePayload.Error) == 'string' ? responsePayload.Error : 'Something went wrong!'
    
                    // Set error text in the formError field
                    document.querySelector(`#${formId} .formError`).innerHTML = error;
    
                    // Unhide the form error field on the form
                    document.querySelector(`#${formId} .formError`).style.display = 'block';
                } else {
                    // If call is successful, send response to form response processor
                    app.formResponseProcessor(formId, payload, responsePayload);
                }
            })
        })
    }
}

app.formResponseProcessor = function (formId, requestPayload, responsePayload) {
    let functionToCall = false;
    if (formId == 'accountCreate') {
        // Take the form and password, and use it to log the user in
        let newPayload = {
            phone: requestPayload.phone,
            password: requestPayload.password
        };

        app.client.request(undefined, 'api/tokens', 'POST', undefined, newPayload, (newStatusCode, newResponsePayload) => {
            // Display error the form when encountered
            if (newStatusCode !== 200) {
                
                // Set formError field width error text
                document.querySelector(`#${formId} .formError`).innerHTML = 'Sorry, an error was encountered';

                // Show (unhide) the formError field
                document.querySelector(`#${formId} .formError`).style.display = 'block';
            } else {
                // Successful, set Token redirect user
                app.setSessionToken(newResponsePayload);
                window.location = '/checks/all';
            }
        });
    }

    // If login successful, set token in localStorage and redirect the user
    if (formId == 'sessionCreate') {
        app.setSessionToken(responsePayload);
        window.location = '/checks/all';
    }

    // If forms saved user updates successfully, show the success messages
    let formsWithSuccessMessages = ['accountEdit1', 'accountEdit2'];
    if (formsWithSuccessMessages.indexOf(formId) > -1) {
        document.querySelector(`#${formId} .formSuccess`).style.display = 'block';
    }

    // If user successfully deleted their account, redirect them to the account deleted page
    if (formId == 'accountEdit3') {
        app.logUserOut(false);
        window.location = '/account/deleted';
    }
}

// Get session token from localstorage and set it in the app.config object
app.getSessionToken = function () {
    let tokenString = localStorage.getItem('token');

    if (typeof(tokenString) == 'string') {
        try {
            let token = JSON.parse(tokenString);
            app.config.sessionToken = token;

            if (typeof(token) == 'object') {
                app.setLoggedInClass(true);
            } else {
                app.setLoggedInClass(false);
            }
        } catch (e) {
            app.config.sessionToken = false;
            app.setLoggedInClass(false);
        }
    }
}

// Set (or remove) loggedIn class from the body
app.setLoggedInClass = function (add) {
    let target = document.querySelector('body');
    if (add) {
        target.classList.add('loggedIn');
    } else {
        target.classList.remove('loggedIn')
    }
}

// Set session token in app.config object and in localstorage
app.setSessionToken = function (token) {
    app.config.sessionToken = token;
    let tokenString = JSON.stringify(token);
    localStorage.setItem('token', tokenString);

    if (typeof(token) == 'object') {
        app.setLoggedInClass(true);
    } else {
        app.setLoggedInClass(false);
    }
}

// Load data on the page
app.loadDataOnPage = function () {
    // Get the current page from the body class
    let bodyClasses = document.querySelector('body').classList;
    let primaryClass = typeof(bodyClasses[0]) == 'string' ? bodyClasses[0] : false;

    // Logic for account settings page
    if (primaryClass == 'accountEdit') {
        app.loadAccountEditPage();
    }
}

// Load the account edit page
app.loadAccountEditPage = function () {
    // Get the phone number from the current token OR log user out if none is found
    let phone = typeof(app.config.sessionToken.phone) == 'string' ? app.config.sessionToken.phone : false;

    if (phone) {
        // Get the user
        let queryStringObject = {
            phone
        }

        app.client.request(undefined, 'api/users', 'GET', queryStringObject, undefined, (statusCode, responsePayload) => {
            if (statusCode == 200) {
                // Put the data into the forms as values (where needed)
                document.querySelector('#accountEdit1 .firstNameInput').value = responsePayload.firstName;
                document.querySelector('#accountEdit1 .lastNameInput').value = responsePayload.lastName;
                document.querySelector('#accountEdit1 .displayPhoneInput').value = responsePayload.phone;

                // put hidden form field in both forms
                let hiddenPhoneInputs = document.querySelectorAll('input.hiddenPhoneNumberInput')

                for (let i = 0; i < hiddenPhoneInputs.length; i++) {
                    hiddenPhoneInputs[i].value = responsePayload.phone;
                }
            } else {
                // If response is not a 200, log out user
                app.logUserOut();
            }
        })
    } else {
        app.logUserOut();
    }
}

// Renew the token
app.renewToken = function (callback) {
    let currentToken = typeof(app.config.sessionToken) == 'object' ? app.config.sessionToken : false;

    if (currentToken) {
        // 
        let payload = {
            id: currentToken.id,
            extend: true
        };

        app.client.request(undefined, 'api/tokens', 'PUT', undefined, payload, (statusCode, responsePayload) => {
            // Display error on form
            if (statusCode == 200) {
                // get new token details
                let queryStringObject = {'id': currentToken.id};

                app.client.request(undefined, 'api/tokens', 'GET', queryStringObject, undefined, (statusCode, responsePayload) => {
                    // Display error on form when encountered
                    if(statusCode == 200) {
                        app.setSessionToken(responsePayload);
                        callback(false);
                    } else {
                        app.setSessionToken(false);
                        callback(true)
                    }
                });
            } else {
                app.setSessionToken(false);
                callback(true)
            }
        });
    } else {
        app.setSessionToken(false);
        callback(true);
    }
}

// Loop to renew token often
app.tokenRenewalLoop = function () {
    setInterval(() => {
        app.renewToken((err) => {
            if (!err) {
                console.log("Token renewed successfully @ " + Date.now());
            }
        })
    }, 1000 * 60);
}

// Init (bootstrap)
app.init = function () {
    // Bind all form submissions
    app.bindForms();

    // Bind logout button
    app.bindLogoutButton();

    // Get token from localStorage
    app.getSessionToken();

    // Renew token
    app.tokenRenewalLoop();

    // load data on page
    app.loadDataOnPage();
}

// Call app init after the window has loaded
window.onload = function () {
    app.init();
}