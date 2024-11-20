This page describes how Identity-Aware Proxy (IAP) handles a request with an expired session and how to make sure that AJAX app requests and WebSocket requests are successful.

IAP session flow
----------------

When using the standard IAP login flow, the user receives a session cookie that references their Google login session. IAP uses this cookie to confirm that the user is still signed in. IAP requires a user to sign in before accessing a IAP-secured app.

IAP sessions are refreshed periodically. However, if the user is using a Google account to sign in, IAP sessions are also tied to the user's Google login session. In this case, IAP will only require the user to log in again in one of the following situations:

*   The user signed out of their account
*   Their account was suspended
*   The account requires a password reset

If a user is signed out, IAP detects a Google account state change within a couple minutes. Once detected, IAP invalidates the session.

IAP re-checks Identity and Access Management (IAM) authorization for all requests during valid sessions. Updates to a IAP-secured app's IAM access policy might take a few minutes to take effect.

### IAP session expiration

For a login flow using a Google account, the IAP session is tied to the underlying Google login session, and only expires when that session expires irrespective of the `exp` claim in the JWT sent in the authorization header.

For [programmatic authentication](https://cloud.google.com/iap/docs/authentication-howto), IAP does honor the `exp` claim in the JWT sent in the Authorization header.

For Identity Platform login flow, the IAP session stays valid for up to one hour after the user has logged out.

### WebSocket requests

IAP only supports WebSocket for initial requests and doesn't continuously check authorization. When a WebSocket request is received, it starts with an HTTP `Upgrade` request. IAP evaluates this as a standard HTTP `GET` request. After the request is authorized, IAP passes the request to the server, opening a persistent connection. After this, IAP does not monitor the requests or refresh the session.

Expired session responses
-------------------------

IAP returns different responses for expired sessions based on the type of request.

### Non-AJAX requests

For non-AJAX requests, the user is redirected to the login flow to refresh the session. If the user is still signed in, this redirect is transparent.

### AJAX requests

Chrome and other browsers are [phasing out](https://blog.chromium.org/2020/01/building-more-private-web-path-towards.html) third-party cookies. The recommendations for making AJAX requests in this page won't work if [third-party cookies](https://developers.google.com/privacy-sandbox/3pcd/prepare/audit-cookies#understand) are disabled. However, the provided recommendations will remain functional if both the source and target of the AJAX [requests](https://web.dev/articles/url-parts) are from the [same site](https://web.dev/articles/same-site-same-origin#same-site-cross-site).

For instructions on managing third-party cookies in Chrome, see [Delete, allow and manage cookies in Chrome](https://support.google.com/chrome/answer/95647?sjid=7241780428986433770-NC).

IAP relies on cookies to manage user sessions. It also relies on a sequence of redirects to establish a session as part of a login flow. Establishing a session is not always possible if the application is using Cross-Origin Resource Sharing (CORS) to make AJAX requests to an IAP-protected application.

To successfully make a CORS request to an IAP-protected application, an IAP session needs to be established out-of-band. Note that for an AJAX request that sends a CORS request from `source_domain->target_domain` where `target_domain` hosts the IAP-protected application, there needs to be a session established on the `target_domain`. There is no way to share cookies between `source_domain` and `target_domain`.

Once the session on `target_domain` is established, the developer needs to enable credentials to be sent in the request. By default, JavaScript methods don't attach cookies to requests. To enable credentials in the request, requests sent with an [`XMLHttpRequest`](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/withCredentials) object need the `withCredentials` property set to true, while requests sent with the [`Fetch API`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#Sending_a_request_with_credentials_included) need the `credentials` option set to `include` or `same-origin`.

The following guide recommends a pattern for web developers to be able to establish and refresh an IAP session successfully.

#### Understanding the IAP response

For AJAX requests, IAP returns an HTTP `401: Unauthorized` status code. Note that AJAX request detection can't be done perfectly. If you're getting a `302` status code response instead of `401` status code to AJAX requests, an `X-Requested-With` header with a value of `"XMLHttpRequest"` can be added to AJAX requests. This tells IAP that the request originates from JavaScript.

#### Handling an HTTP `401` AJAX response

To establish an IAP session after the application receives HTTP `401`, the application can open a new window for the URL `target_domain` + `?gcp-iap-mode=DO_SESSION_REFRESH`. This is a special handler that only establishes the IAP session at `target_domain`. If the window is retained as open, it'll keep on refreshing the session periodically, asking for user input as required. Optionally, the user can choose to close the window, and the handler for HTTP `401` status in the developer's code should pop-up a window again for session refresh as required.

##### Step 1: Modify your app code

The following example shows how to modify your app code to handle the HTTP `401` status code and provide a session refresh link to the user:

if (response.status === 401) {
    statusElm.innerHTML = 'Login stale. <input type="button" value="Refresh" onclick="sessionRefreshClicked();"/>';
}

##### Step 2: Install an onclick handler

The sample code below installs an onclick handler that closes the window after the session is refreshed:

var iapSessionRefreshWindow = null;

function sessionRefreshClicked() {
    if (iapSessionRefreshWindow == null) {
        iapSessionRefreshWindow = window.open("/?gcp-iap-mode=DO_SESSION_REFRESH");
        window.setTimeout(checkSessionRefresh, 500);
    }
    return false;
}

function checkSessionRefresh() {
    if (iapSessionRefreshWindow != null && !iapSessionRefreshWindow.closed) {
        fetch('/favicon.ico').then(function(response) {
            if (response.status === 401) {
                window.setTimeout(checkSessionRefresh, 500);
            } else {
                iapSessionRefreshWindow.close();
                iapSessionRefreshWindow = null;
            }
        });
    } else {
        iapSessionRefreshWindow = null;
    }
}