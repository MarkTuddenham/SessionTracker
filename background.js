'use strict';

function openWindow(windowId) {
  // If window already exists then bring it to the front
  chrome.windows.get(
    windowId,
    function (win) {
      if (chrome.runtime.lastError) {
        // Window does not exist anymore so lets
        // recreate it from storage.

        console.log('Window does not exist!')
        getWindowState(
          windowId,
          function (savedWindow) {
            console.log(savedWindow);
            // They've just asked to open this window
            // so give it focus
            // but what if it was minimised?
            savedWindow.focused = true;
            chrome.windows.create(
              savedWindow,
              function (newWin) {
                // stop tracking the old window
                // and track the new one instead
                setTracked(windowId, false, function () {
                  setTracked(newWin.id, true,
                    function () {
                      updateWindowState(newWin.id);
                    })
                });
              }
            );
          }
        );
      } else {
        // Window exists so lets bring it to front
        console.log(win);
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



function updateWindowState(windowId) {

  isTracked(
    windowId,
    function (tracked) {
      if (tracked) {
        console.log('Saving ' + windowId + ' to the store.');
        chrome.windows.get(
          windowId,
          { populate: true },
          function (win) {
            console.log(win);
            let data = {};
            data.left = win.left;
            data.top = win.top;
            data.width = win.width;
            data.height = win.height;
            data.incognito = win.incognito;
            data.url = [];

            for (let t in win.tabs) {
              data.url.push(win.tabs[t].url);
            }

            let windowStore = {}
            windowStore['window_' + windowId] = data;
            console.log(windowStore);
            chrome.storage.local.set(windowStore);
          }
        );
      } else {
        console.log('removed store for: ' + windowId);
        chrome.storage.local.remove('window_' + windowId)
      }
    }
  );
}


// ~~~~~~~~~ LISTENERS ~~~~~~~~~~
chrome.tabs.onAttached.addListener(function (tabId, attachInfo) {
  console.log('Attached: ' + tabId + ', Window: ' + attachInfo.newWindowId);
  updateWindowState(attachInfo.newWindowId);
});
// chrome.tabs.onCreated.addListener(function (tab) {
//   updateWindowState(tab.windowId);
// });
chrome.tabs.onDetached.addListener(function (tabId, detachInfo) {
  console.log('Detached: ' + tabId + ', Window: ' + detachInfo.oldWindowId);
  updateWindowState(detachInfo.oldWindowId);
});
// chrome.tabs.onReplaced.addListener(function (addedTabId, removedTabId) {
//   chrome.tabs.get(removedTabId,
//     function (tab) {
//       updateWindowState(tab.windowId);
//     });
// });
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  console.log('Updated: ' + tabId + ', Window: ' + tab.windowId);
  updateWindowState(tab.windowId);
});

// ~~~~~~~~~~ MESSAGES ~~~~~~~~~~
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.type == 'open_window') {
    openWindow(msg.windowId);

  } else if (msg.type == 'close_window') {
    closeWindow(msg.windowId, sendResponse);

  } else if (msg.type == 'save_window') {
    updateWindowState(msg.windowId);
  }

  // force wait for sendResponse callback.
  return true;
});


// ~~~~~~~~~~ HELPERS ~~~~~~~~~~~
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
  console.log('setTracked ' + windowId + ' ' + tracked);
  chrome.storage.local.get(
    'tracking',
    function (store) {
      let tracking = store.tracking || {};
      tracking[windowId] = tracked;
      console.log(tracking);
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
