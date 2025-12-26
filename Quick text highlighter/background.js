let startTime = 0;
let currentSite = '';
let isTracking = true;
let notifiedSites = new Set();

chrome.tabs.onActivated.addListener(function(activeInfo) {
  chrome.tabs.get(activeInfo.tabId, function(tab) {
    if (tab.url) {
      const site = new URL(tab.url).hostname;
      if (site !== currentSite) {
        updateTime();
        currentSite = site;
        if (isTracking) {
          startTime = Date.now();
          chrome.storage.local.set({ startTime: startTime, currentSite: currentSite });
        }
      }
    }
  });
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.active) {
    const site = new URL(tab.url).hostname;
    if (site !== currentSite) {
      updateTime();
      currentSite = site;
      if (isTracking) {
        startTime = Date.now();
        chrome.storage.local.set({ startTime: startTime, currentSite: currentSite });
      }
    }
  }
});

function updateTime() {
  if (currentSite && startTime) {
    const timeSpent = Date.now() - startTime;
    chrome.storage.local.get([currentSite], function(data) {
      const total = (data[currentSite] || 0) + timeSpent;
      chrome.storage.local.set({ [currentSite]: total });
      if (Math.floor(total / 60000) > 1 && !notifiedSites.has(currentSite)) { // Changed to 1 min for testing
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon.png',
          title: 'Excess Use',
          message: `You have spent over 1 minute on ${currentSite}`
        });
        notifiedSites.add(currentSite);
      }
    });
  }
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'toggleTracking') {
    isTracking = !isTracking;
    if (isTracking && currentSite) {
      startTime = Date.now();
      chrome.storage.local.set({ startTime: startTime, currentSite: currentSite });
    } else {
      updateTime();
      startTime = 0;
      chrome.storage.local.remove(['startTime', 'currentSite']);
    }
    sendResponse({ isTracking: isTracking, startTime: startTime, currentSite: currentSite });
  } else if (request.action === 'getTrackingStatus') {
    sendResponse({ isTracking: isTracking, startTime: startTime, currentSite: currentSite });
  }
});

chrome.alarms.create('updateTime', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm.name === 'updateTime' && isTracking && currentSite) {
    updateTime();
    startTime = Date.now(); // Reset startTime after updating
  }
});

chrome.alarms.create('checkExcess', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm.name === 'checkExcess' && isTracking && currentSite) {
    chrome.storage.local.get([currentSite], function(data) {
      const total = (data[currentSite] || 0) + (Date.now() - startTime);
      if (Math.floor(total / 60000) > 1 && !notifiedSites.has(currentSite)) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon.png',
          title: 'Excess Use',
          message: `You have spent over 1 minute on ${currentSite}`
        });
        notifiedSites.add(currentSite);
      }
    });
  }
});