// ==UserScript==
// @author gsrafael01
// @connect api.steampowered.com
// @description Adds some cool features to BLAEO.
// @grant GM.getValue
// @grant GM.setValue
// @grant GM.xmlHttpRequest
// @grant GM_getValue
// @grant GM_setValue
// @grant GM_xmlhttpRequest
// @match https://www.backlog-assassins.net/*
// @match http://www.backlog-assassins.net/*
// @name Enhanced BLAEO
// @namespace enhancedBlaeo
// @require https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js
// @require https://raw.githubusercontent.com/gsrafael01/monkey-scripts/3.0.0-beta.4/utils/dom-parser.js
// @require https://raw.githubusercontent.com/gsrafael01/monkey-scripts/3.0.0-beta.4/utils/request.js
// @run-at document-idle
// @version 3.0.0-beta.4
// ==/UserScript==

(async () => {
  `use strict`;

  const settings = {};

  await setDefaultValues();
  document.addEventListener(`turbolinks:load`, loadFeatures);
  await loadFeatures();

  async function setDefaultValues() {
    const oldValues = {
      steamApiKey: `SteamAPIKey`,
      steamId: `SteamID64`,
      username: `Username`,
      lastSync: `LastSync`,
      ownedGames: `OwnedGames`,
      tlcCurrentMonth: `TLCCurrentMonth`,
      tlcGames: `TLCGames`,
      tlcList: `TLCList`
    };
    const defaultValues = {
      steamApiKey: ``,
      steamId: ``,
      username: `?`,
      lastSync: 0,
      ownedGames: [],
      tlcCurrentMonth: ``,
      tlcGames: [],
      tlcList: ``
    };
    for (const key in defaultValues) {
      if (typeof (await GM.getValue(key)) === `undefined`) {
        if (key === `ownedGames` || key === `tlcGames`) {
          await GM.setValue(key, JSON.stringify(await GM.getValue(oldValues[key], defaultValues[key])));
        } else {
          await GM.setValue(key, await GM.getValue(oldValues[key], defaultValues[key]));
        }
      }
      if (key === `ownedGames` || key === `tlcGames`) {
        settings[key] = JSON.parse(await GM.getValue(key));
      } else {
        settings[key] = await GM.getValue(key);
      }
    }
  }

  async function loadFeatures() {
    if (window.location.href.match(/\/settings\//)) {
      addSettingsButton();
    } else if (settings.steamApiKey) {
      if (!settings.tlcList || (settings.tlcCurrentMonth !== getCurrentMonth())) {
        await getTlcList();
      } else if (window.location.href.match(settings.tlcList)) {
        await checkTlcList();
      }
    }
  }

  function addSettingsButton() {
    const navigation = document.querySelector(`.nav-pills`);
    navigation.insertAdjacentHTML(`beforeEnd`, `
      <li>
        <a href="#enhancedBlaeo">Enhanced BLAEO</a>
      </li>
    `);
    const button = navigation.lastElementChild;
    button.addEventListener(`click`, () => loadSettings(button, navigation));
    if (window.location.href.match(/#enhancedBlaeo/)) {
      loadSettings(button, navigation);
    }
  }

  function loadSettings(button, navigation) {
    window.location.hash = `#enhancedBlaeo`;
    navigation.querySelector(`.active`).classList.remove(`active`);
    button.classList.add(`active`);
    const element = document.querySelector(`.col-sm-9`);
    element.innerHTML = `
      <div class="form-group">
        <label class="control-label">Steam API Key</label>
        <input class="form-control" type="text" value="${settings.steamApiKey}" style="margin: 0 0 10px;"/>
        <div>
          <button class="btn btn-primary" type="submit">Save</button>
        </div>
      </div>
      <div class="form-group">
        <label class="control=label">Sync</label>
        <p>Your current username is <b>${settings.username}</b> and you have <b>${settings.ownedGames.length}</b> games in your library, right?</p>
        <p>
          <i>Last synced <span></span>.</i>
        </p>
        <div>
          <button class="btn btn-primary" type="submit">Sync</button>
        </div>
      </div>
    `;
    const steamApiKeyInput = element.firstElementChild.firstElementChild.nextElementSibling;
    const saveButton = steamApiKeyInput.nextElementSibling.firstElementChild;
    const usernameElement = element.lastElementChild.firstElementChild.firstElementChild.firstElementChild;
    const ownedGamesElement = usernameElement.nextElementSibling;
    const lastSyncElement = element.lastElementChild.lastElementChild.previousElementSibling.firstElementChild.firstElementChild;
    const syncButton = element.lastElementChild.lastElementChild.firstElementChild;
    lastSyncElement.textContent = settings.lastSync ? new Date(lastSync).toLocaleString() : `never`;
    saveButton.addEventListener(`click`, () => saveSettings(saveButton, steamApiKeyInput.value));
    syncButton.addEventListener(`click`, () => sync(syncButton, usernameElement, ownedGamesElement, lastSyncElement));
  }

  async function saveSettings(saveButton, steamApiKey) {
    saveButton.textContent = `Saving...`;
    settings.steamApiKey = steamApiKey;
    await GM.setValue(`steamApiKey`, settings.steamApiKey);
    if (!settings.username || settings.username === `?`) {
      settings.username = document.querySelector(`.navbar-btn`).getAttribute(`href`).match(/\/users\/(.+?)$/)[1];
      await GM.setValue(`username`, settings.username);
    }
    if (!settings.steamId) {
      const dom = (await monkeyRequest.send(`/users/${settings.username}`)).dom;
      if (dom) {
        settings.steamId = dom.querySelector(`.btn-profile`).getAttribute(`href`).match(/\/profiles\/(.+?)$/)[1];
        await GM.setValue(`steamId`, settings.steamId);
      }
    }
    saveButton.textContent = `Save`;
  }

  async function sync(syncButton, usernameElement, ownedGamesElement, lastSyncElement) {
    syncButton.textContent = `Syncing...`;
    await syncOwnedGames();
    usernameElement.textContent = settings.username;
    ownedGamesElement.textContent = settings.ownedGames.length;
    lastSyncElement.textContent = new Date(settings.lastSync).toLocaleString();
    syncButton.textContent = `Sync`;
  }

  function syncOwnedGames() {
    return new Promise(async resolve => {
      settings.username = document.querySelector(`.navbar-btn`).getAttribute(`href`).match(/\/users\/(.+?)$/)[1];
      await GM.setValue(`username`, settings.username);
      settings.ownedGames = [];
      GM.xmlHttpRequest({
        method: `GET`,
        url: `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${settings.steamApiKey}&steamid=${settings.steamId}&format=json`,
        onload: async response => {
          const games = JSON.parse(response.responseText).response.games;
          for (const game of games) {
            settings.ownedGames.push(game.appid);
          }
          settings.lastSync = Date.now();
          await GM.setValue(`ownedGames`, JSON.stringify(settings.ownedGames));
          await GM.setValue(`lastSync`, settings.lastSync);
          resolve();
        }
      });
    });
  }

  function getCurrentMonth() {
    const date = new Date();
    return `${date.getFullYear()}-${`0${date.getMonth() + 1}`.slice(-2)}`;
  }

  async function getTlcList() {
    const currentMonth = getCurrentMonth();
    const dom = (await monkeyRequest.send(`/themes/${currentMonth}`)).dom;
    if (dom) {
      const list = dom.querySelector(`[id*="theme-list"]`);
      if (list) {
        settings.tlcCurrentMonth = currentMonth;
        settings.tlcGames = [];
        settings.tlcList = list.getAttribute(`href`).match(/\/posts\/(.+?)$/)[1];
        await GM.setValue(`tlcCurrentMonth`, settings.tlcCurrentMonth);
        await GM.setValue(`tlcGames`, JSON.stringify(settings.tlcGames));
        await GM.setValue(`tlcList`, settings.tlcList);
      }
    }
  }

  async function checkTlcList() {
    const elements = document.querySelectorAll(`.panel-default [href*="store.steampowered.com/app/"], .panel-default [href*="store.steampowered.com/sub/"]`);
    const games = {};
    for (const element of elements) {
      const id = parseInt(element.getAttribute(`href`).match(/store\.steampowered\.com\/(app|sub)\/(\d+)/)[1]);
      if (settings.tlcGames.indexOf(id) < 0) {
        settings.tlcGames.push(id);
        tagTlcNew(element);
      }
      if (settings.ownedGames.indexOf(id) > -1) {
        tagTlcOwned(element);
      }
      games[id] = element;
    }
    await GM.setValue(`tlcGames`, settings.tlcGames);
    await tagTlcStatus(`rgb(92 ,184, 92)`, games, `Beaten`);
    await tagTlcStatus(`rgb(91, 192, 222)`, games, `Completed`);
    document.querySelector(`[id*="counter"]`).innerHTML = `
      <font size="4">
          <b>${elements.length} Games</b>
      </font>
    `;
  }

  function tagTlcNew(element) {
    element.insertAdjacentHTML(`afterEnd`, `
      <b style="color: rgb(85, 85, 85);"> [New]</b>
    `);
  }

  function tagTlcOwned(element) {
    element.insertAdjacentHTML(`afterEnd`, `
      <b style="color: rgb(217, 83, 79);"> [Owned]</b>
    `);
  }

  async function tagTlcStatus(color, games, status) {
    const dom = (await monkeyRequest.send(`/users/${settings.username}/games/${status.toLowerCase()}`)).dom;
    if (dom) {
      const elements = dom.querySelectorAll(`.steam`);
      const ids = new Set();
      for (const element of elements) {
        ids.add(parseInt(element.getAttribute(`href`).match(/\d+/)[0]));
      }
      const foundIds = new Set(Object.keys(games).filter(x => ids.has(x)));
      for (const id of foundIds) {
        games[id].insertAdjacentHTML(`afterEnd`, `
          <b style="color: ${color};"> [${status}]</b>
        `);
      }
    }
  }
})();
