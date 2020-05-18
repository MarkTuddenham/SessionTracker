'use strict';

// chrome.storage.local.clear();


function openWindow(windowId) {
    // If window already exists then bring it to the front
    chrome.windows.get(
        windowId,
        function (win) {
            if (chrome.runtime.lastError) {
                // Window does not exist anymore so lets
                // recreate it from storage.

                console.log('Window does not exist, attempting to open')
                getWindowState(
                    windowId,
                    function (savedWindow) {
                        //console.log(savedWindow);
                        // They've just asked to open this window
                        // so give it focus
                        savedWindow.focused = true;
                        chrome.windows.create(
                            savedWindow,
                            function (newWin) {
                                replaceWindow(windowId, newWin.id)
                            }
                        );
                    }
                );
            } else {
                // Window exists so lets bring it to front
                //console.log(win);
                chrome.windows.update(
                    win.id,
                    { focused: true }
                );
            }
        }
    );
}

function closeWindow(windowId, cb) {
    setTracked(windowId, false, cb);
}

function replaceWindow(old_window_id, new_window_id){
    // stop tracking the old window
    // and track the new one instead
    setTracked(old_window_id, false, function () {
        setTracked(new_window_id, true, function () {
            updateWindowState(new_window_id);
            updateWindowState(old_window_id);
            getName(old_window_id, function (name) {
                setName(new_window_id, name);
            });
        });
    });
}


function updateWindowState(windowId) {
    isTracked(
        windowId,
        function (tracked) {
            if (tracked) {
                // console.log('Saving ' + windowId + ' to the store.');
                chrome.windows.get(
                    windowId,
                    { populate: true },
                    function (win) {
                        if (!chrome.runtime.lastError) {
                            let data = getWindowData(win)
                            let windowStore = {}
                            windowStore['window_' + windowId] = data;
                            // console.log("updateWindowState windowStore: ")
                            // console.log(windowStore);
                            chrome.storage.local.set(windowStore);
                        }
                    }
                );
            } else {
                // console.log('Removed store for: ' + windowId);
                chrome.storage.local.remove('window_' + windowId)
            }
        }
    );
}


function setName(windowId, name, cb) {
    chrome.storage.local.get(
        'names',
        function (store) {
            let names = store.names || {};
            names[windowId] = name;
            chrome.storage.local.set({ names })
        }
    );
}

function getName(windowId, cb) {
    chrome.storage.local.get(
        'names',
        function (store) {
            let name = store.names ? store.names[windowId] : undefined;
            cb(name || ('Window ' + windowId));
        }
    );
}


// ~~~~~~~~~ LISTENERS ~~~~~~~~~~
chrome.tabs.onAttached.addListener(function (tabId, attachInfo) {
    // console.log('Tab attached: ' + tabId + ', window: ' + attachInfo.newWindowId);
    updateWindowState(attachInfo.newWindowId);
});

chrome.tabs.onDetached.addListener(function (tabId, detachInfo) {
    // console.log('Tab detached: ' + tabId + ', window: ' + detachInfo.oldWindowId);
    updateWindowState(detachInfo.oldWindowId);
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    // console.log('Updated tab: ' + tabId + ', window: ' + tab.windowId);
    updateWindowState(tab.windowId);
});

chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
    // console.log('Tab removed: ' + tabId + ', window: ' + removeInfo.windowId);
    updateWindowState(removeInfo.windowId);
});

chrome.windows.onCreated.addListener(function (window) {
    // detect if this is one that we should be tracking (i.e. opened by restore windows)
    getAllTracked(id_map => {
        Object.keys(id_map).forEach(old_window_id => {
            if(id_map[old_window_id]){
                // if we were tracking it, then see if its this one
                getWindowState(old_window_id, old_window => {
                    chrome.windows.get(window.id, {populate:true}, new_window => {

                        //TODO: check that the window isn't already open and that 
                        // the user hasnt just opened a duplicate window
                        if (areWindowsEqual(getWindowData(new_window), old_window)) {
                            replaceWindow(old_window_id, new_window.id)
                        } 

                    });
                })
            }
        })
    })
})

// ~~~~~~~~~~ MESSAGES ~~~~~~~~~~
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg.type == 'open_window') {
        openWindow(msg.windowId);

    } else if (msg.type == 'close_window') {
        closeWindow(msg.windowId, sendResponse);

    } else if (msg.type == 'save_window') {
        updateWindowState(msg.windowId);

    } else if (msg.type == 'rename') {
        console.log('Rename window: ' + msg.windowId + ', value: ' + msg.value);
        setName(msg.windowId, msg.value);
    }

    // force wait for sendResponse callback.
    return true;
});


// ~~~~~~~~~~ HELPERS ~~~~~~~~~~~

function getWindowData(win){
    let data = {};
    data.top = win.top;
    data.left = win.left;
    data.width = win.width;
    data.height = win.height;
    data.incognito = win.incognito;
    data.url = [];

    for (let t in win.tabs) {
        data.url.push(win.tabs[t].url);
    }
    return data
}

const zip = (arr1, arr2) => arr1.map((k, i) => [k, arr2[i]]);

function areWindowsEqual(win1, win2){
    let incognito_same = win1.incognito == win2.incognito;
    
    let urls_same = win1.url.length == win2.url.length
    if (urls_same) {
        let pairs = zip(win1.url.sort(), win2.url.sort())
        // console.log(pairs)
        pairs.forEach(p=> {if (p[0]!=p[1]) {urls_same = false;}})
    }
    return incognito_same && urls_same 
}



function getWindowState(windowId, cb) {
    const storeId = 'window_' + windowId;
    chrome.storage.local.get(
        storeId,
        function (store) {
            if (cb) {
                cb(store[storeId]);
            }
        }
    );
}

function isTracked(windowId, cb) {
    if (cb) {
        chrome.storage.local.get(
            'tracking',
            function (store) {
                if (store && store.tracking) {
                    cb(store.tracking[windowId]);
                } else {
                    // no tracking data has been set yet
                    cb(false);
                }
            }
        );
    }
}

function setTracked(windowId, tracked, cb) {
    // console.log('setTracked ' + windowId + ' ' + tracked);
    chrome.storage.local.get(
        'tracking',
        function (store) {
            let tracking = store.tracking || {};
            tracking[windowId] = tracked;
            // console.log(tracking);
            chrome.storage.local.set(
                { tracking },
                function () {
                    // TODO should be a listener call from background.js
                    updateWindowState(windowId);
                    if (cb) {
                        cb();
                    }
                }
            );
        }
    );
}

function getAllTracked(cb) {
    if (cb) {
        chrome.storage.local.get(
            'tracking',
            function (store) {
                if (store && store.tracking) {
                    cb(store.tracking);
                } else {
                    // no tracking data has been set yet
                    cb(false);
                }
            }
        );
    }
}

