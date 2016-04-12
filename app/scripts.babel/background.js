'use strict';

function updateBadgeText(count) {
  var text = count === 0 ? '' : count > 99 ? '99+' : count.toString();
  chrome.browserAction.setBadgeText({ text });
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'updateBadgeCounter') {
    updateBadgeText(request.count);
  }
});

var updateNumberOfPostsBlocked = function(tabId) {
  chrome.tabs.sendMessage(tabId, { action: 'getNumberOfPostsBlocked' }, function(response) {
    var count = response && response.count ? response.count : 0;
    updateBadgeText(count);
  });
};

var tabEventHandler = function(tab){
  var tabId = typeof tab === 'number' ? tab : tab.tabId;
  updateNumberOfPostsBlocked(tabId);
};

chrome.tabs.onActivated.addListener(tabEventHandler);
chrome.tabs.onCreated.addListener(tabEventHandler);
