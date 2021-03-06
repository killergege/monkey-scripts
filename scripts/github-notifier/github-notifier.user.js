// ==UserScript==
// @author rafaelgssa
// @description Checks for unread notifications on GitHub every 60 seconds and notifies the user about them.
// @grant none
// @match https://github.com/*
// @name GitHub Notifier
// @namespace githubNotifier
// @noframes
// @require https://raw.githubusercontent.com/rafaelgssa/monkey-scripts/3.1.0/utils/DomParser.js
// @require https://raw.githubusercontent.com/rafaelgssa/monkey-scripts/3.1.0/utils/Request.js
// @run-at document-end
// @version 3.1.0
// @downloadURL https://github.com/rafaelgssa/monkey-scripts/raw/master/scripts/github-notifier/github-notifier.user.js
// @updateURL https://github.com/rafaelgssa/monkey-scripts/raw/master/scripts/github-notifier/github-notifier.user.js
// ==/UserScript==
// ==/UserScript==

(() => {
  `use strict`;

  init();

  function init() {
    if (document.body.classList.contains(`logged-in`)) {
      // User is logged in.
      check(document);
    }
  }

  async function check(dom) {
    if (!dom) {
      dom = (await monkeyRequest.send(`https://github.com`, { credentials: `include` })).dom;
    }
    document.title = document.title.replace(/^\(New\)\s/, ``);
    if (dom && dom.querySelector(`.mail-status.unread`)) {
      // There are unread notifications.
      document.title = `(New) ${document.title}`;
    }
    window.setTimeout(check, 60000);
  }
})();