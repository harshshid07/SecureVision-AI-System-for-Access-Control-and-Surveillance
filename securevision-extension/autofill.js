chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.credentials) {
    const { username, password } = request.credentials;

    const usernameField = document.querySelector('input[name="username"], input[name="email"], input[type="email"]');
    const passwordField = document.querySelector('input[type="password"]');
    const loginButton = document.querySelector('button[type="submit"], input[type="submit"]');

    if (usernameField && passwordField) {
      usernameField.value = username;
      passwordField.value = password;

      if (loginButton) {
        loginButton.click();
      }
    }
  }
});