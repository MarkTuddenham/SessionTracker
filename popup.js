'use strict'

// "Imports"
const isTracked = chrome.runtime.getBackgroundPage().isTracked;
const setTracked = chrome.runtime.getBackgroundPage().setTracked;
const getName = chrome.runtime.getBackgroundPage().getName;
const setName = chrome.runtime.getBackgroundPage().setName;

const trackWindowBtn = document.getElementById('trackWindow');
const trackWindowSlider = document.getElementById('trackWindowSlider');
const tabsList = document.getElementById('tabsList');

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

    let textBox = document.createElement("input");
    let close = document.createElement('button');
    let open = document.createElement('button');

    textBox.setAttribute('class', 'window_name');
    textBox.setAttribute('type', 'text');
    getName(windowId, function (name) {
        textBox.setAttribute('value', name);
    });

    close.setAttribute('class', 'window_action close');
    open.setAttribute('class', 'window_action open');

    close.value = windowId;
    open.value = windowId;

    textBox.addEventListener(
        'change',
        function () {
            textBox.blur();
            chrome.runtime.sendMessage({
                type: 'rename',
                value: textBox.value,
                windowId
            });

        }
    );

    close.addEventListener('click', closeWindow);
    open.addEventListener('click', openWindow);

    para.appendChild(textBox);
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
        updatePopup
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
