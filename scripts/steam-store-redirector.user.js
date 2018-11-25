// ==UserScript==
// @author gsrafael01
// @description Redirects removed games from the Steam store to SteamCommunity or SteamDB.
// @grant GM.info
// @grant GM.getValue
// @grant GM.setValue
// @grant GM_info
// @grant GM_getValue
// @grant GM_setValue
// @match https://steamcommunity.com/*
// @match https://*/*
// @match http://*/*
// @name Steam Store Redirector
// @namespace steamStoreRedirector
// @noframes
// @require https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js
// @require https://raw.githubusercontent.com/gsrafael01/monkey-scripts/3.0.0-beta.4/utils/settings.js
// @require https://raw.githubusercontent.com/gsrafael01/monkey-scripts/3.0.0-beta.4/utils/mutation-observer.js
// @run-at document-start
// @version 3.0.0-beta.4
// ==/UserScript==

(async () => {
  `use strict`;

  await monkeySettings.init([
    {
      id: `destination`,
      message: `Where do you want to be redirected to?`,
      values: [
        {
          key: `0`,
          template: `"%" for SteamCommunity`,
          value: 0
        },
        {
          key: `1`,
          template: `"%" for SteamDB`,
          value: 1
        }
      ]
    }
  ], true);

  init();

  function init() {
    const match = window.location.href.match(/store.steampowered.com\/#(app|sub)_(\d+)/);
    if (match) {
      switch (monkeySettings.getSetting(`destination`)) {
        case 0:
          window.location.href = `https://steamcommunity.com/${match[1]}/${match[2]}`;
          break;
        case 1:
          window.location.href = `https://steamdb.info/${match[1]}/${match[2]}`;
          break;
      }
    } else {
      if (window.location.href.match(/store.steampowered.com\/.+?#(app|sub)_\d+/)) {
        window.location.hash = ``;
      }
      changeLinks(document);
      monkeyMutationObserver.init(document, changeLinks);
    }
  }

  function changeLinks(dom) {
    const elements = dom.querySelectorAll(`[href*="store.steampowered.com/app/"], [href*="store.steampowered.com/sub/"]`);
    for (const element of elements) {
      const url = element.getAttribute(`href`);
      if (!url.match(/#(app|sub)_\d+/)) {
        const match = url.match(/(app|sub)\/(\d+)/);
        element.setAttribute(`href`, `${url}#${match[1]}_${match[2]}`);
      }
    }
  }
})();