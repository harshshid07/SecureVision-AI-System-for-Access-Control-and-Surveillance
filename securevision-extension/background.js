// Background service worker for the extension

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
    console.log('SecureVision AI Extension Installed');
    
    // Set default storage
    chrome.storage.local.get(['credentials'], (result) => {
        if (!result.credentials) {
            chrome.storage.local.set({ credentials: {} });
        }
    });
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getCredentials') {
        chrome.storage.local.get(['credentials'], (result) => {
            sendResponse({ credentials: result.credentials || {} });
        });
        return true; // Required for async response
    }
    
    if (request.action === 'saveCredentials') {
        chrome.storage.local.set({ credentials: request.credentials }, () => {
            sendResponse({ success: true });
        });
        return true;
    }
});

// Removed chrome.commands - it requires additional manifest permissions
// If you want keyboard shortcuts, add this to manifest.json:
// "commands": {
//   "clear-credentials": {
//     "suggested_key": { "default": "Ctrl+Shift+X" },
//     "description": "Clear all saved credentials"
//   }
// }