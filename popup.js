'use strict'

// "Imports"
const isTracked = chrome.extension.getBackgroundPage().isTracked;
const setTracked = chrome.extension.getBackgroundPage().setTracked;

const trackWindowBtn = document.getElementById('trackWindow');
const trackWindowSlider = document.getElementById('trackWindowSlider');
const tabsList = document.getElementById('tabsList');

// chrome.storage.local.clear();

function onPopupOpen(event) {
    chrome.windows.getCurrent(
        { populate: true },
        function (win) {
            updatePopup();
        }
    );
}

function updatePopup() {
    displayTrackedWindows();
    updateTrackingButton();
}

function updateTrackingButton() {
    chrome.windows.getCurrent(
        function (win) {
            isTracked(win.id,
                function (tracked) {
                    trackWindowSlider.checked = tracked;
                }
            );
        }
    );
}

function displayTrackedWindows() {

    // Clear current window list dom elements
    while (tabsList.lastChild) {
        tabsList.removeChild(tabsList.lastChild);
    }

    // Populate with active elements
    chrome.storage.local.get(
        'tracking',
        function (store) {
            for (let w in store.tracking) {
                if (store.tracking[w]) {
                    tabsList.appendChild(createWindowRow(w));
                }
            }
        }
    );

}

function createWindowRow(windowId) {
    let para = document.createElement('P');

    let close = document.createElement('BUTTON');
    let open = document.createElement('BUTTON');
    close.className = 'window_action close';
    open.className = 'window_action open';

    close.value = windowId;
    open.value = windowId;

    close.addEventListener('click', closeWindow);
    open.addEventListener('click', openWindow);

    para.appendChild(document.createTextNode(windowId));
    para.appendChild(close);
    para.appendChild(open);
    return para;
}


function openWindow(event) {
    chrome.runtime.sendMessage({ log: 'Opening window.' });
    const windowId = Number(event.target.value);
    chrome.runtime.sendMessage(
        { type: 'open_window', windowId: windowId },
        updatePopup
    );
}


function closeWindow(event) {
    chrome.runtime.sendMessage({ log: 'Closing window.' });
    const windowId = Number(event.target.value);
    chrome.runtime.sendMessage(
        { type: 'close_window', windowId: windowId },
        function () {
            console.log('closed window');
            updatePopup();
        }
    );
}


function trackWindow() {
    chrome.windows.getCurrent(function (win) {
        setTracked(
            win.id,
            trackWindowSlider.checked,
            function () {
                updatePopup();
                chrome.runtime.sendMessage({ type: 'save_window', windowId: win.id });
                chrome.runtime.sendMessage({
                    log: (trackWindowSlider.checked ?
                        'Tracking window ' :
                        'Untracking window '
                    ) + win.id
                });

            }
        );
    });

}


document.addEventListener("DOMContentLoaded", onPopupOpen);
trackWindowSlider.addEventListener('click', trackWindow);
