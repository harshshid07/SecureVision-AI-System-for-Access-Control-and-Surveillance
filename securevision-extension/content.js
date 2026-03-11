if (window.location.href.includes("/apps")) {
  const urlParams = new URLSearchParams(window.location.search);
  const username = urlParams.get('username');
  if (username) {
    chrome.runtime.sendMessage({ user: username });
  }
}