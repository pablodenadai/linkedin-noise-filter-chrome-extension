/**
 * LinkedIn Job Filter - Chrome Extension
 *
 * Author: Pablo De Nadai
 * Source code: https://github.com/ghpabs/linkedin-job-filter-chrome-extension
 * License: MIT - 2016
 *
 * More job opportunities. Less distraction.
 *
 * Features:
 * - Hide the following LinkedIn build-in sections:
 *   - "People in your network have new connections"
 *   - "See anyone you know? Connect with them"
 *   - "[Member] has joined:"
 *   - "[Member] is now following:"
 *   - "[Member] has an updated profile:"
 * - Keep the following LinkedIn build-in sections:
 *   - "Jobs you may be interested in"
 * - Hide posts which don't contain whitelisted content (mostly spam)
 * - Hide shared images (mostly spam)
 * - Display number of blocked posts
 *
 * Note: This extension is an experiment and can potentially hide posts
 * which are of your interest. Use it at your own risk.
 *
 * We also recommend uBlock Origin - Chrome Extension for advert blocking.
 * See here: https://chrome.google.com/webstore/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm?hl=en
 */

'use strict';

// ######
// Configutation
// ######

var opacity = false,
  hide = true,
  debug = false,
  counter = true;

var contentWhitelist = [
  '/day',
  'apply',
  'available',
  'bonus',
  'contact me',
  'contact my',
  'contract',
  'cv',
  'email me',
  'hiring',
  'job',
  'looking for',
  'looking to',
  'needed',
  'opportunities',
  'opportunity',
  'per day',
  'permanent',
  'recruiting',
  'recruitment',
  'required',
  'resume',
  'role',
  'salary',
  'seeking',
  'vacancies',
  'vacancy'
];

var classesBlacklist = [
  '.member-profile-snapshot',
  '.member-people-follow-member',
  '.member-follow-company',
  '.member-follow-company-digest',
  '.many-members-connect-members-rollup',
  '.people-connect-recommend',
  '.people-follow-recommend'
];

var classesWhitelist = [
  '.company-recommend-job-digest'
];



// #######
// State definition
// #######

var state = {
  totalNumberOfPostsProcessed: 0,
  numberOfPostsBlocked: 0
};



// ######
// Static DOM manipulation
// ######

var removeAttr = function(attr) {
  $(`[${attr}]`).each(function(){
    $(this).removeAttr(attr);
  });
};

if (debug) {
  // Remove large attributes that cause the DevTools to slow down
  removeAttr('data-li-utrk-ad');
  removeAttr('data-li-utrk-el');
}

var rightPanel = $('ul#sticky-rail');
var pageCounter = $(`
  <li class="ljf-box">
    <p>
      Blocked <span class="ljf-counter"></span> out of <span class="ljf-total"></span> posts.
    </p>
    <br>
    <p class="ljf-muted">
      Thanks for using <a href="https://chrome.google.com/webstore/detail/linkedin-job-filter/bnlngcoijeeepjajfgciinhknhgekmhf/" target="_blank">LinkedIn Job Filter</a>.
    </p>
  </li>
`);

rightPanel.prepend(pageCounter);



// ######
// Dynamic DOM manipulation
// ######

var addTag = function(element, isStatic, text) {
  var content = $(`<span>[${isStatic ? 'Static' : 'Dynamic'}] ${text}</span>`);
  element.prepend(content);
};

var updatePageCounter = function() {
  pageCounter.find('.ljf-counter').text(state.numberOfPostsBlocked);
  pageCounter.find('.ljf-total').text(state.totalNumberOfPostsProcessed);
};

var updateBadgeCounter = function() {
  chrome.runtime.sendMessage({ action: 'updateBadgeCounter', count: state.numberOfPostsBlocked });
};

chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action == 'getNumberOfPostsBlocked') {
    sendResponse({ count: state.numberOfPostsBlocked });
  }
});

var addOneToCounter = function() {
  state.numberOfPostsBlocked++;
  updatePageCounter();
  updateBadgeCounter();
};

var filterOutElement = function(element) {
  if (opacity) element.css('opacity', '0.4');
  if (hide) element.hide();
  if (counter) addOneToCounter();
};

var processFeed = function(feedList, isStatic) {
  state.totalNumberOfPostsProcessed += feedList.length;

  feedList.each(function() {
    var feedElement = $(this);

    if (feedElement.is(classesBlacklist.join(', '))) {
      if (debug) addTag(feedElement, isStatic, 'Class Blacklist');
      filterOutElement(feedElement);
      return true;
    }

    if (feedElement.is(classesWhitelist.join(', '))) {
      if (debug) addTag(feedElement, isStatic, 'Class Whitelisted');
      return true;
    }

    var contentElement = feedElement.find('div.text-entity:not(.comment-entity .text-entity), div.side-article');
    var contentText = contentElement.text();

    var regex = new RegExp(contentWhitelist.join('|'), 'ig');
    if (regex.test(contentText)) {
      if (debug) addTag(feedElement, isStatic, `Content Whitelisted: ${contentText.match(regex).join(', ')}.`);
      return true;
    };

    if (debug) addTag(feedElement, isStatic, 'Content Non-Whitelisted');
    filterOutElement(feedElement);
  });
};

var staticFeedList = $('.feed-update');

// Run static feed processing
processFeed(staticFeedList, true);

// Handle mutation - new posts dynamically added to the page
var mutation = {
  target: staticFeedList.parent()[0],
  config: {
    childList: true
  }
};

// Create an observer instance
var observer = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    processFeed($(mutation.addedNodes), false);
  });
});

// Pass in the target node, as well as the observer options
observer.observe(mutation.target, mutation.config);
