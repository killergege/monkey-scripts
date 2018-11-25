// ==UserScript==
// @author gsrafael01
// @description Checks for unread notifications on GitHub every 60 seconds and notifies the user about them.
// @grant none
// @match https://github.com/*
// @name GitHub Notifier
// @namespace githubNotifier
// @noframes
// @require https://raw.githubusercontent.com/gsrafael01/monkey-scripts/3.0.0-beta.2/utils/dom-parser.js
// @require https://raw.githubusercontent.com/gsrafael01/monkey-scripts/3.0.0-beta.2/utils/request.js
// @run-at document-end
// @version 3.0.0-beta.2
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