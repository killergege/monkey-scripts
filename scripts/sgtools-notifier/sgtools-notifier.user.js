// ==UserScript==
// @author rafaelgssa
// @description Notifies the user when a SGTools rules check is complete and has an option to redirect to the giveaway.
// @grant GM.info
// @grant GM.getValue
// @grant GM.setValue
// @grant GM_info
// @grant GM_getValue
// @grant GM_setValue
// @match https://www.sgtools.info/*
// @match http://www.sgtools.info/*
// @name SGTools Notifier
// @namespace sgtoolsNotifier
// @noframes
// @require https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js
// @require https://raw.githubusercontent.com/rafaelgssa/monkey-scripts/3.1.0/utils/Settings.js
// @version 3.1.0
// @downloadURL https://github.com/rafaelgssa/monkey-scripts/raw/master/scripts/sgtools-notifier/sgtools-notifier.user.js
// @updateURL https://github.com/rafaelgssa/monkey-scripts/raw/master/scripts/sgtools-notifier/sgtools-notifier.user.js
// ==/UserScript==
// ==/UserScript==

(async () => {
  `use strict`;

  await monkeySettings.init([
    {
      defaultValue: false,
      id: `doRedirect`,
      message: `Do you want to be redirected to the giveaway after the check is complete?`,
      values: [
        {
          key: `y`,
          template: `"%" for yes`,
          value: true
        },
        {
          key: `n`,
          template: `"%" for no`,
          value: false
        }
      ]
    }
  ]);

  let checkButton = null;
  let errorElement = null;
  let rulesElement = null;
  let urlElement = null;

  init();

  function init() {
    checkButton = document.querySelector(`#check`);
    if (checkButton) {
      errorElement = document.querySelector(`#error_alert`);
      rulesElement = document.querySelector(`.rules`);
      urlElement = document.querySelector(`#gaurl`);
      checkButton.addEventListener(`click`, waitForRulesCheck);
    }
  }

  function waitForRulesCheck() {
    if (checkButton.getAttribute(`id`) === `getlink` && rulesElement.classList.contains(`is-hidden`)) {
      // Rules have been checked and the user passed them.
      if (monkeySettings.getSetting(`doRedirect`)) {
        checkButton.removeEventListener(`click`, waitForRulesCheck);
        checkButton.click();
        waitForGiveawayLink();
      } else {
        document.title = `✔️ ${document.title}`;
      }
    } else if (!errorElement.classList.contains(`hidden`)) {
      // Rules have been checked and the user failed to pass them.
      document.title = `❌ ${document.title}`;
    } else {
      // Rules have not been checked.
      window.setTimeout(waitForRulesCheck, 100);
    }
  }

  function waitForGiveawayLink() {
    if (urlElement.firstElementChild) {
      // Giveaway link has been revealed.
      window.location.href = urlElement.firstElementChild.getAttribute(`href`);
    } else {
      // Giveaway link has not been revealed.
      window.setTimeout(waitForGiveawayLink, 100);
    }
  }
})();