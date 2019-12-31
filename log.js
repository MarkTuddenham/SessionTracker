'use strict'

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.log) {
        console.log(message.log);
    }
});