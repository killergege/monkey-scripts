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
// @match https://www.steamgifts.com/discussion/b9XQO/*
// @name Enhanced BLAEO
// @namespace enhancedBlaeo
// @require https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js
// @require https://raw.githubusercontent.com/gsrafael01/monkey-scripts/3.0.0/utils/DomParser.js
// @require https://raw.githubusercontent.com/gsrafael01/monkey-scripts/3.0.0/utils/Request.js
// @run-at document-idle
// @version 3.0.3
// ==/UserScript==

(() => {
  `use strict`;

  const isInBlaeo = window.location.host === `www.backlog-assassins.net`;
  const settings = {};
  const url = `https://www.backlog-assassins.net`;

  init();

  async function init() {
    await setDefaultValues();
    if (isInBlaeo) {
      document.addEventListener(`turbolinks:load`, loadFeatures);
    }
    await loadFeatures();
  }

  async function setDefaultValues() {
    const oldValues = {
      isAdmin: ``,
      steamId: `SteamID64`,
      username: `Username`,
      lastSync: `LastSync`,
      ownedGames: `OwnedGames`,
      pgPresets: ``,
      tlcCurrentMonth: `TLCCurrentMonth`,
      tlcGames: `TLCGames`,
      tlcList: `TLCList`
    };
    const defaultValues = {
      isAdmin: false,
      steamId: ``,
      username: `?`,
      lastSync: 0,
      ownedGames: [],
      pgPresets: [],
      tlcCurrentMonth: ``,
      tlcGames: [],
      tlcList: ``
    };
    for (const key in defaultValues) {
      if (typeof (await GM.getValue(key)) === `undefined`) {
        if (Array.isArray(defaultValues[key])) {
          await GM.setValue(key, JSON.stringify(await GM.getValue(oldValues[key], defaultValues[key])));
        } else {
          await GM.setValue(key, await GM.getValue(oldValues[key], defaultValues[key]));
        }
      }
      if (Array.isArray(defaultValues[key])) {
        settings[key] = JSON.parse(await GM.getValue(key));
      } else {
        settings[key] = await GM.getValue(key);
      }
    }
    if (isInBlaeo && document.querySelector(`[href="/admin"]`)) {
      settings.isAdmin = true;
      GM.setValue(`isAdmin`, true);
    }
  }

  async function loadFeatures() {
    if (isInBlaeo) {
      if (window.location.href.match(/\/admin\/users\/new\?steamId/)) {
        addAtUser();
      } else if (window.location.href.match(/\/settings\//)) {
        addSmButton();
      } else if (window.location.href.match(/\/posts\/new/)) {
        addPgButton();
      }
      if (settings.steamId) {
        if (!settings.tlcList || (settings.tlcCurrentMonth !== getCurrentMonth())) {
          await getTlcList();
        } else if (window.location.href.match(settings.tlcList)) {
          await checkTlcList();
        }
      }
    } else if (settings.isAdmin && window.location.href.match(/\/discussion\/b9XQO\//)) {
      addAtButtons();
    }
  }

  // [AT] Admin Tools

  function addAtButtons() {
    const elements = document.querySelectorAll(`.comment__username`);
    for (const element of elements) {
      const username = element.textContent.trim();
      element.insertAdjacentHTML(`beforeEnd`, `
        <img src="https://www.backlog-assassins.net/logo-32x32.png" height="12" style="cursor: pointer;" title="Add user to BLAEO">
      `);
      const button = element.lastElementChild;
      button.addEventListener(`click`, () => openAtWindow(button, username));
    }
  }

  async function openAtWindow(button, username) {
    let success = true;
    try {
      window.open(`https://www.backlog-assassins.net/admin/users/new?steamId=${(await monkeyRequest.send(`https://www.steamgifts.com/user/${username}`)).dom.querySelector(`[href*="/profiles/"]`).getAttribute(`href`).match(/\d+/)[0]}`, null, `height=100,width=100`);
    } catch (error) {
      window.alert(`An error occurred when adding ${username}...`);
      success = false;
    }
    if (success) {
      button.remove();
    }
  }

  async function addAtUser() {
    const match = window.location.search.match(/\?steamId=(\d+)/);
    if (match) {
      const steamId = match[1];
      if (window.localStorage.enhancedBlaeo_at === steamId) {
        delete window.localStorage.enhancedBlaeo_at;
        window.close();
        return;
      }
      window.localStorage.enhancedBlaeo_at = steamId;
      (await getElement(`[name=q]`)).value = steamId;
      (await getElement(`.btn-default`)).click();
      const alertElement = await getElement(`.alert`);
      if (!alertElement.classList.contains(`alert-success`)) {
        delete window.localStorage.enhancedBlaeo_at;
        window.close();
        return;
      }
      (await getElement(`.btn-primary:not([disabled])`)).click();
    }
  }

  function getElement(query) {
    return new Promise(resolve => {
      waitForElement(query, resolve);
    });
  }

  function waitForElement(query, resolve) {
    const element = document.querySelector(query);
    if (element) {
      resolve(element);
    } else {
      setTimeout(waitForElement, 100, query, resolve);
    }
  }

  // [SM] Settings Menu

  function addSmButton() {
    const oldNavigation = document.querySelector(`#enhanced-blaeo`);
    if (oldNavigation) {
      oldNavigation.remove();
    }
    const navigation = document.querySelector(`.nav-pills`);
    navigation.insertAdjacentHTML(`beforeEnd`, `
      <li id="enhanced-blaeo">
        <a href="#enhancedBlaeo">Enhanced BLAEO</a>
      </li>
    `);
    const button = navigation.lastElementChild;
    button.addEventListener(`click`, () => loadSmMenu(button, navigation));
    if (window.location.href.match(/#enhancedBlaeo/)) {
      loadSmMenu(button, navigation);
    }
  }

  function loadSmMenu(button, navigation) {
    window.location.hash = `#enhancedBlaeo`;
    navigation.querySelector(`.active`).classList.remove(`active`);
    button.classList.add(`active`);
    const element = document.querySelector(`.col-sm-9`);
    element.innerHTML = `
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
    const usernameElement = element.firstElementChild.firstElementChild.nextElementSibling.firstElementChild;
    const ownedGamesElement = usernameElement.nextElementSibling;
    const lastSyncElement = element.firstElementChild.lastElementChild.previousElementSibling.firstElementChild.firstElementChild;
    const syncButton = element.firstElementChild.lastElementChild.firstElementChild;
    lastSyncElement.textContent = settings.lastSync ? new Date(settings.lastSync).toLocaleString() : `never`;
    syncButton.addEventListener(`click`, () => sync(syncButton, usernameElement, ownedGamesElement, lastSyncElement));
  }

  async function sync(syncButton, usernameElement, ownedGamesElement, lastSyncElement) {
    syncButton.textContent = `Syncing...`;
    settings.username = document.querySelector(`.navbar-btn`).getAttribute(`href`).match(/\/users\/(.+?)$/)[1];
    await GM.setValue(`username`, settings.username);
    usernameElement.textContent = settings.username;
    if (!settings.steamId) {
      const dom = (await monkeyRequest.send(`${url}/users/${settings.username}`)).dom;
      if (dom) {
        settings.steamId = dom.querySelector(`.btn-profile`).getAttribute(`href`).match(/\/profiles\/(.+?)$/)[1];
        await GM.setValue(`steamId`, settings.steamId);
      }
    }
    await syncOwnedGames();
    ownedGamesElement.textContent = settings.ownedGames.length;
    lastSyncElement.textContent = new Date(settings.lastSync).toLocaleString();
    syncButton.textContent = `Sync`;
  }

  async function syncOwnedGames() {
    settings.ownedGames = [];
    const dom = (await monkeyRequest.send(`${url}/users/+${settings.steamId}/games`)).dom;
    if (dom) {
      const elements = dom.querySelectorAll(`.steam`);
      const ids = new Set();
      for (const element of elements) {
        ids.add(parseInt(element.getAttribute(`href`).match(/\d+/)[0]));
      }
      settings.ownedGames.push(...ids);
      settings.lastSync = Date.now();
      await GM.setValue(`ownedGames`, JSON.stringify(settings.ownedGames));
      await GM.setValue(`lastSync`, settings.lastSync);
    }
  }

  function getCurrentMonth() {
    const date = new Date();
    return `${date.getFullYear()}-${`0${date.getMonth() + 1}`.slice(-2)}`;
  }

  // [PG] Post Generator

  async function addPgButton() {
    const defaultInfo = {
      format: `box`,
      boxAchievements: `%achievements_count% of %achievements_total% achievements`,
      boxNoAchievements: `no achievements`,
      boxLinkAchievements: true,
      boxLinkScreenshots: false,
      boxScreenshots: `%screenshots_count% screenshots`,
      boxNoScreenshots: `no screenshots`,
      boxReviewPosition: `Left`,
      panelAchievements: `%achievements_count% of %achievements_total% achievements (%achievements_percentage%%)`,
      panelNoAchievements: `no achievements`,
      panelLinkAchievements: true,
      panelLinkScreenshots: false,
      panelScreenshots: `%screenshots_count% screenshots`,
      panelNoScreenshots: `no screenshots`,
      panelRating: ``,
      panelUsePredefinedBackground: true,
      panelPredefinedBackground: `Blue`,
      panelUseCustomBackground: false,
      panelCustomBackground: `#000000`,
      panelUseCollapsibleReview: false,
      barAchievements: `%achievements_count% of %achievements_total% achievements (%achievements_percentage%%)`,
      barNoAchievements: `no achievements`,
      barLinkAchievements: true,
      barLinkScreenshots: false,
      barScreenshots: `%screenshots_count% screenshots`,
      barNoScreenshots: `no screenshots`,
      barBackgroundType: `Solid`,
      barBackground1: `#000000`,
      barBackground2: `#000000`,
      barImagePosition: `Left`,
      barCompletionBarPosition: `Left`,
      barTitleColor: `#ffffff`,
      barTextColor: `#ffffff`,
      barCustomText: ``,
      barUseCollapsibleReview: false,
      barReviewTriggerMethod: `Bar Click`,
      customHtml: ``,
      review: ``,
      presetName: ``
    };
    const element = document.querySelector(`.pull-right`);
    element.insertAdjacentHTML(`afterEnd`, `
			<button class="btn btn-default pull-right" data-toggle="modal" data-target="#post-generator" style="margin-right: 5px;" type="button">Generate</button>
    `);
    document.body.insertAdjacentHTML(`beforeEnd`, `
			<div class="modal fade" id="post-generator" role="dialog" tabindex="-1">
  			<div class="modal-dialog modal-lg" role="document">
    			<div class="modal-content">
      			<div class="modal-header">
              <button aria-label="Close" class="close" data-dismiss="modal" type="button">
                <span aria-hidden="true">&times;</span>
              </button>
        			<h4 class="modal-title">Post Generator</h4>
      			</div>
      			<div class="modal-body">
							<div class="form-group">
								<input class="form-control" data-target="#search-results" id="filter-games" placeholder="Start typing to search for games …" type="text">
							</div>
							<div id="search-results"></div>
              <div class="panel panel-default" style="display: none;">
                <div class="panel-heading">Generator</div>
                <div class="panel-body" id="generator"></div>
							</div>
              <div class="panel panel-default" style="display: none;">
                <div class="panel-heading">Result</div>
                <div class="panel-body" id="generator-result"></div>
                <p style="margin-left: 10px;">Reordering games is currently not possible.</p>
              </div>
						</div>
            <div class="modal-footer">
              <button class="btn btn-default" data-dismiss="modal" type="button">Close</button>
              <button class="btn btn-primary" data-dismiss="modal" id="generate-button" type="button">Generate</button>
            </div>
      		</div>
    		</div>
  		</div>
		`);
    const items = {
      cache: JSON.parse(window.localStorage.enhancedBlaeo_pg || `[]`),
      toSave: [`<ul class="games">`, `</ul>`],
      toShow: [`<ul class="games">`, `</ul>`]
    };
    const textAreaElement = document.querySelector(`#post_text`);
    document.querySelector(`#filter-games`).addEventListener(`input`, () => onPgSearchInput(defaultInfo, items));
    document.querySelector(`#generate-button`).addEventListener(`click`, () => textAreaElement.value = `${textAreaElement.value}\n\n${items.toSave.join(``).replace(/\s+/g, ` `)}\n\n`);
    element.addEventListener(`click`, () => delete window.localStorage.enhancedBlaeo_pg);
    if (items.cache.length) {
      for (const info of items.cache) {
        if (info) {
          await generatePgGame(null, defaultInfo, info, items);
        }
      }
    }
  }

  async function onPgSearchInput(defaultInfo, items) {
    if (!settings.steamId) {
      alert(`You must sync in the Enhanced BLAEO section of the settings menu first.`);
      return;
    }
    const searchResultsElement = document.querySelector(`#search-results`);
    const text = (await monkeyRequest.send(`${url}/users/+${settings.steamId}/games/filter?q=${document.querySelector(`#filter-games`).value}&exclude=vbyypyb`)).text;
    searchResultsElement.innerHTML = text;
    const elements = searchResultsElement.querySelectorAll(`.game`);
    for (const element of elements) {
      element.insertAdjacentHTML(`beforeEnd`, `
			  <button class="btn btn-default" style="margin-bottom: 5px;" type="button">Select</button>
      `);
      element.lastElementChild.addEventListener(`click`, () => selectPgGame(element, defaultInfo, null, items, 0));
    }
  }

  function selectPgGame(element, defaultInfo, info, items, itemsIndex) {
    if (info) {
      info = Object.assign({}, defaultInfo, info);
    } else {
      const titleElement = element.querySelector(`.title`);
      const captionElement = element.querySelector(`.caption`);
      info = Object.assign({
        code: element.getAttribute(`data-item`),
        state: element.className.match(/game-(?!thumbnail)(.+?)(\s|$)/)[1],
        image: element.querySelector(`img`).getAttribute(`src`),
        title: titleElement.textContent.trim(),
        id: titleElement.nextElementSibling.getAttribute(`href`).match(/\d+/)[0],
        playtime: captionElement.firstElementChild.textContent.trim(),
        achievements: captionElement.lastElementChild.textContent.trim(),
      }, defaultInfo);
    }
    document.querySelector(`#filter-games`).value = ``;
    document.querySelector(`#search-results`).innerHTML = ``;
    const generatorElement = document.querySelector(`#generator`);
    generatorElement.parentElement.style.display = `block`;
    generatorElement.innerHTML = `
      <div>
        <p>These templates are replaced with info about you:</p>
        <ul>
          <li><b>%steamid%</b> - Your Steam id.</li>
          <li><b>%username%</b> - Your BLAEO username (this can be your SteamGifts or your Steam username depending on your BLAEO settings).</li>
        </ul>
        <p>These templates are replaced with info about the game:</p>
        <ul>
          <li><b>%state%</b> - The state of the game (beaten, completed, never-played, unfinished or wont-play)</li>
          <li><b>%image%</b> - The URL of the game image.</li>
          <li><b>%title%</b> - The title of the game.</li>
          <li><b>%id%</b> - The Steam appid of the game.</li>
          <li><b>%playtime%</b> - Your playtime.</li>
          <li><b>%achievements%</b> - Your achievements in the format "X of Y achievements" or "no achievements".</li>
          <li><b>%achievements_count%</b> - The number of achievements you have unlocked in the game.</li>
          <li><b>%achievements_total%</b> - The total number of achievements in the game.</li>
          <li><b>%achievements_percentage%</b> - The percentage of achievements you have unlocked in the game.</li>
          <li><b>%screenshots%</b> - Your screenshots in the format "X screenshots" or "no screenshots" (if the option is enabled).</li>
          <li><b>%screenshots_count%</b> - The number of screenshots you have taken in the game (if the option is enabled)</li>
        </ul>
        <div class="dropdown">
          <button aria-expanded="false" aria-haspopup="true" data-toggle="dropdown" id="apply-preset-button" type="button">
            Apply Preset
            <span class="caret"></span>
          </button>
          <ul aria-labelledby="apply-preset-button" class="dropdown-menu">
            ${settings.pgPresets.length > 0 ? settings.pgPresets.map(x => `
              <li>
                <a style="cursor: pointer;">${x.name}</a>
              </li>
            `).join(``) : `
              <p>No presets saved.</p>
            `}
          </ul>
        </div>
        <br>
        <p>Deleting presets is currently not possible.</p>
        <br>
        <ul class="nav nav-tabs" id="generator-nav" role="tablist">
          <li ${info.format === `box` ? `class="active"` : ``} data-format="box" role="presentation">
						<a aria-controls="box" data-toggle="tab" href="#box" role="tab">Box</a>
					</li>
          <li ${info.format === `panel` ? `class="active"` : ``} data-format="panel" role="presentation">
						<a aria-controls="panel" data-toggle="tab" href="#panel" role="tab">Panel</a>
					</li>
          <li ${info.format === `bar` ? `class="active"` : ``} data-format="bar" role="presentation">
						<a aria-controls="bar" data-toggle="tab" href="#bar" role="tab">Bar</a>
					</li>
          <li ${info.format === `custom` ? `class="active"` : ``} data-format="custom" role="presentation">
						<a aria-controls="custom" data-toggle="tab" href="#custom" role="tab">Custom</a>
					</li>
        </ul>
        <div class="tab-content">
          <div class="tab-pane ${info.format === `box` ? `active` : ``}" id="box" role="tabpanel">
            <div class="form-group">
              <label for="box-achievements">Achievements Label:</label>
              <p>You can use templates here.</p>
              <input class="form-control" id="box-achievements" type="text" value="${info.boxAchievements || defaultInfo.boxAchievements}">
              <label for="box-no-achievements">No Achievements Label:</label>
              <p>You can use templates here.</p>
              <input class="form-control" id="box-no-achievements" type="text" value="${info.boxNoAchievements || defaultInfo.boxNoAchievements}">
              <div class="checkbox">
                <label><input ${info.boxLinkAchievements ? `checked` : ``} id="box-link-achievements" type="checkbox">Link achievements to your stats page.</label>
              </div>
              <div class="checkbox">
                <label><input ${info.boxLinkScreenshots ? `checked` : ``} id="box-link-screenshots" type="checkbox">Check if you have screenshots for the game and link them.</label>
              </div>
              <label for="box-screenshots">Screenshots Label:</label>
              <p>You can use templates here.</p>
              <input class="form-control" id="box-screenshots" type="text" value="${info.boxScreenshots || defaultInfo.boxScreenshots}">
              <label for="box-no-screenshots">No Screenshots Label:</label>
              <p>You can use templates here.</p>
              <input class="form-control" id="box-no-screenshots" type="text" value="${info.boxNoScreenshots || defaultInfo.boxNoScreenshots}">
              <label for="box-review-position">Review Position:</label>
              <select class="form-control" id="box-review-position">
                <option ${info.boxReviewPosition === `Left` ? `selected` : ``}">Left</option>
                <option ${info.boxReviewPosition === `Right` ? `selected` : ``}">Right</option>
              </select>
            </div>
					</div>
          <div class="tab-pane ${info.format === `panel` ? `active` : ``}" id="panel" role="tabpanel">
            <div class="form-group">
              <label for="panel-achievements">Achievements Label:</label>
              <p>You can use templates here.</p>
              <input class="form-control" id="panel-achievements" type="text" value="${info.panelAchievements || defaultInfo.panelAchievements}">
              <label for="panel-no-achievements">No Achievements Label:</label>
              <p>You can use templates here.</p>
              <input class="form-control" id="panel-no-achievements" type="text" value="${info.panelNoAchievements || defaultInfo.panelNoAchievements}">
              <div class="checkbox">
                <label><input ${info.panelLinkAchievements ? `checked` : ``} id="panel-link-achievements" type="checkbox">Link achievements to your stats page.</label>
              </div>
              <div class="checkbox">
                <label><input ${info.panelLinkScreenshots ? `checked` : ``} id="panel-link-screenshots" type="checkbox">Check if you have screenshots for the game and link them.</label>
              </div>
              <label for="panel-screenshots">Screenshots Label:</label>
              <p>You can use templates here.</p>
              <input class="form-control" id="panel-screenshots" type="text" value="${info.panelScreenshots || defaultInfo.panelScreenshots}">
              <label for="panel-no-screenshots">No Screenshots Label:</label>
              <p>You can use templates here.</p>
              <input class="form-control" id="panel-no-screenshots" type="text" value="${info.panelNoScreenshots || defaultInfo.panelNoScreenshots}">
              <label for="panel-rating">Rating:</label>
              <input class="form-control" id="panel-rating" type="text" value="${info.panelRating}">
              <div class="radio">
                <label>
                  <input ${info.panelUsePredefinedBackground ? `checked` : ``} id="panel-use-predefined-background" name="optradio" type="radio">Use Predefined Background
                </label>
              </div>
              <label for="panel-predefined-background">Predefined Background Color:</label>
              <select class="form-control" id="panel-predefined-background">
                <option ${info.panelPredefinedBackground === `Blue` ? `selected` : ``}>Blue</option>
                <option ${info.panelPredefinedBackground === `Green` ? `selected` : ``}>Green</option>
                <option ${info.panelPredefinedBackground === `Grey` ? `selected` : ``}>Grey</option>
                <option ${info.panelPredefinedBackground === `Red` ? `selected` : ``}>Red</option>
                <option ${info.panelPredefinedBackground === `Yellow` ? `selected` : ``}>Yellow</option>
              </select>
              <div class="radio">
                <label>
                  <input ${info.panelUseCustomBackground ? `checked` : ``} id="panel-use-custom-background" name="optradio" type="radio">Use Custom Background
                </label>
              </div>
              <label for "panel-custom-background">Custom Background Color:</label>
              <input class="form-control" id="panel-custom-background" type="color" value="${info.panelCustomBackground}">
              <div class="checkbox">
                <label><input ${info.panelUseCollapsibleReview ? `checked` : ``} id="panel-use-collapsible-review" type="checkbox">Use collapsible review.</label>
              </div>
            </div>
          </div>
          <div class="tab-pane ${info.format === `bar` ? `active` : ``}" id="bar" role="tabpanel">
            <div class="form-group">
              <label for="bar-achievements">Achievements Label:</label>
              <p>You can use templates here.</p>
              <input class="form-control" id="bar-achievements" type="text" value="${info.barAchievements || defaultInfo.barAchievements}">
              <label for="bar-no-achievements">No Achievements Label:</label>
              <p>You can use templates here.</p>
              <input class="form-control" id="bar-no-achievements" type="text" value="${info.barNoAchievements || defaultInfo.barNoAchievements}">
              <div class="checkbox">
                <label><input ${info.barLinkAchievements ? `checked` : ``} id="bar-link-achievements" type="checkbox">Link achievements to your stats page.</label>
              </div>
              <div class="checkbox">
                <label><input ${info.barLinkScreenshots ? `checked` : ``} id="bar-link-screenshots" type="checkbox">Check if you have screenshots for the game and link them.</label>
              </div>
              <label for="bar-screenshots">Screenshots Label:</label>
              <p>You can use templates here.</p>
              <input class="form-control" id="bar-screenshots" type="text" value="${info.barScreenshots || defaultInfo.barScreenshots}">
              <label for="bar-no-screenshots">No Screenshots Label:</label>
              <p>You can use templates here.</p>
              <input class="form-control" id="bar-no-screenshots" type="text" value="${info.barNoScreenshots || defaultInfo.barNoScreenshots}">
              <label for="bar-background-type">Background Type:</label>
              <select class="form-control" id="bar-background-type">
                <option ${info.barBackgroundType === `Solid` ? `selected` : ``}>Solid</option>
                <option ${info.barBackgroundType === `Horizontal Gradient` ? `selected` : ``}>Horizontal Gradient</option>
                <option ${info.barBackgroundType === `Vertical Gradient` ? `selected` : ``}>Vertical Gradient</option>
              </select>
              <label for "bar-background-1">Background Color 1:</label>
              <input class="form-control" id="bar-background-1" type="color" value="${info.barBackground1}">
              <label for "bar-background-2">Background Color 2:</label>
              <input class="form-control" id="bar-background-2" type="color" value="${info.barBackground2}">
              <label for="bar-image-position">Image Position:</label>
              <select class="form-control" id="bar-image-position">
                <option ${info.barImagePosition === `Left` ? `selected` : ``}>Left</option>
                <option ${info.barImagePosition === `Right` ? `selected` : ``}>Right</option>
              </select>
              <label for="bar-completion-bar-position">Completion Bar Position:</label>
              <select class="form-control" id="bar-completion-bar-position">
                <option ${info.barCompletionBarPosition === `Left` ? `selected` : ``}>Left</option>
                <option ${info.barCompletionBarPosition === `Right` ? `selected` : ``}>Right</option>
                <option ${info.barCompletionBarPosition === `Hidden` ? `selected` : ``}>Hidden</option>
              </select>
              <label for "bar-title-color">Title Color:</label>
              <input class="form-control" id="bar-title-color" type="color" value="${info.barTitleColor}">
              <label for "bar-text-color">Text Color</label>
              <input class="form-control" id="bar-text-color" type="color" value="${info.barTextColor}">
              <label for="panel-rating">Custom Text:</label>
              <p>You can use templates here.</p>
              <input class="form-control" id="bar-custom-text" type="text" value="${info.barCustomText}">
              <div class="checkbox">
                <label><input ${info.barUseCollapsibleReview ? `checked` : ``} id="bar-use-collapsible-review" type="checkbox">Use collapsible review.</label>
              </div>
              <label for="bar-review-trigger-method">Review Trigger Method:</label>
              <select class="form-control" id="bar-review-trigger-method">
                <option ${info.barReviewTriggerMethod === `Bar Click` ? `selected` : ``}>Bar Click</option>
                <option ${info.barReviewTriggerMethod === `Button Click` ? `selected` : ``}>Button Click</option>
              </select>
            </div>
          </div>
          <div class="tab-pane ${info.format === `custom` ? `active` : ``}" id="custom" role="tabpanel">
            <div class="form-group">
              <label for="custom-html">HTML:</label>
              <p>You can use templates here. Additionally, use %review% to define where you want the review to appear.</p>
              <textarea class="form-control" id="custom-html" rows="5">${info.customHtml}</textarea>
            </div>
          </div>
        </div>
				<div class="form-group">
          <label for="review">Review:</label>
          <p>You can use templates here.</p>
          <textarea class="form-control" id="review" rows="5">${info.review}</textarea>
        </div>
        <div class="form-group">
          <label for="preset-name">Preset Name:</label>
          <p>Save these settings as a preset to quickly reuse later.</p>
          <input class="form-control" id="preset-name" type="text" value="${info.presetName || ``}">
        </div>
        <button class="btn btn-default" id="preset-button" type="button">Save Preset</button>
        <br>
        <br>
      </div>
      <div class="panel panel-default" style="display: none;">
        <div class="panel-heading">Preview</div>
        <div class="panel-body" id="generator-preview"></div>
      </div>
      <button class="btn btn-primary pull-right" id="generator-button" type="button">${itemsIndex ? `Edit` : `Add`}</button>
		`;
    const dropdownElements = generatorElement.querySelectorAll(`.dropdown-menu li`);
    for (const dropdownElement of dropdownElements) {
      dropdownElement.addEventListener(`click`, () => applyPgPreset(defaultInfo, info, items, dropdownElement.textContent));
    }
    document.querySelector(`.nav-tabs`).addEventListener(`click`, () => generatePgGame(generatorElement, defaultInfo, info));
    const tabElements = generatorElement.querySelectorAll(`#generator-nav a[data-toggle="tab"]`);
    for (const tabElement of tabElements) {
      tabElement.addEventListener(`click`, () => setTimeout(() => generatePgGame(generatorElement, defaultInfo, info), 1000), true);
    }
    const controlElements = generatorElement.querySelectorAll(`input, select, textarea`);
    for (const controlElement of controlElements) {
      controlElement.addEventListener(`change`, () => generatePgGame(generatorElement, defaultInfo, info));
    }
    const presetButton = document.querySelector(`#preset-button`);
    presetButton.addEventListener(`click`, () => savePgPreset(info));
    document.querySelector(`#generator-button`).addEventListener(`click`, () => generatePgGame(generatorElement, defaultInfo, info, items, itemsIndex));
    generatePgGame(generatorElement, defaultInfo, info);
  }

  function applyPgPreset(defaultInfo, info, items, name) {
    const preset = settings.pgPresets.filter(x => x.name === name)[0];
    if (preset) {
      info.presetName = preset.name;
      info.format = preset.format;
      info.review = preset.review;
      switch (preset.format) {
        case `box`:
          info.boxAchievements = preset.boxAchievements;
          info.boxNoAchievements = preset.boxNoAchievements;
          info.boxLinkAchievements = preset.boxLinkAchievements;
          info.boxLinkScreenshots = preset.boxLinkScreenshots;
          info.boxScreenshots = preset.boxScreenshots;
          info.boxNoScreenshots = preset.boxNoScreenshots;
          info.boxReviewPosition = preset.boxReviewPosition;
          break;
        case `panel`:
          info.panelAchievements = preset.panelAchievements;
          info.panelNoAchievements = preset.panelNoAchievements;
          info.panelLinkAchievements = preset.panelLinkAchievements;
          info.panelLinkScreenshots = preset.panelLinkScreenshots;
          info.panelScreenshots = preset.panelScreenshots;
          info.panelNoScreenshots = preset.panelNoScreenshots;
          info.panelRating = preset.panelRating;
          info.panelUsePredefinedBackground = preset.panelUsePredefinedBackground;
          info.panelPredefinedBackground = preset.panelPredefinedBackground;
          info.panelUseCustomBackground = preset.panelUseCustomBackground;
          info.panelCustomBackground = preset.panelCustomBackground;
          info.panelUseCollapsibleReview = preset.panelUseCollapsibleReview;
          break;
        case `bar`:
          info.barAchievements = preset.barAchievements;
          info.barNoAchievements = preset.barNoAchievements;
          info.barLinkAchievements = preset.barLinkAchievements;
          info.barLinkScreenshots = preset.barLinkScreenshots;
          info.barScreenshots = preset.barScreenshots;
          info.barNoScreenshots = preset.barNoScreenshots;
          info.barBackgroundType = preset.barBackgroundType;
          info.barBackground1 = preset.barBackground1;
          info.barBackground2 = preset.barBackground2;
          info.barImagePosition = preset.barImagePosition;
          info.barCompletionBarPosition = preset.barCompletionBarPosition;
          info.barTitleColor = preset.barTitleColor;
          info.barTextColor = preset.barTextColor;
          info.barCustomText = preset.barCustomText;
          info.barUseCollapsibleReview = preset.barUseCollapsibleReview;
          info.barReviewTriggerMethod = preset.barReviewTriggerMethod;
          break;
        case `custom`:
          info.customHtml = preset.customHtml;
      }
      selectPgGame(null, defaultInfo, info, items);
    }
  }

  async function generatePgGame(generatorElement, defaultInfo, info, items, itemsIndex) {
    info = Object.assign({}, defaultInfo, info);
    if (generatorElement) {
      info.format = generatorElement.querySelector(`.active`).getAttribute(`data-format`);
      info.review = document.querySelector(`#review`).value;
    }
    const completionColors = {
      'beaten': `#5cb85c`,
      'completed': `#5bc0de`,
      'never-played': `#eeeeee`,
      'unfinished': `#f0ad4e`,
      'wont-play': `#d9534f`
    };
    const panelColors = {
      Blue: `info`,
      Green: `success`,
      Grey: `default`,
      Red: `danger`,
      Yellow: `warning`
    };
    if (generatorElement) {
      info.boxAchievements = document.querySelector(`#box-achievements`).value;
      info.boxNoAchievements = document.querySelector(`#box-no-achievements`).value;
      info.boxLinkAchievements = document.querySelector(`#box-link-achievements`).checked;
      info.boxLinkScreenshots = document.querySelector(`#box-link-screenshots`).checked;
      info.boxScreenshots = document.querySelector(`#box-screenshots`).value;
      info.boxNoScreenshots = document.querySelector(`#box-no-screenshots`).value;
      info.boxReviewPosition = document.querySelector(`#box-review-position`).value;

      info.panelAchievements = document.querySelector(`#panel-achievements`).value;
      info.panelNoAchievements = document.querySelector(`#panel-no-achievements`).value;
      info.panelLinkAchievements = document.querySelector(`#panel-link-achievements`).checked;
      info.panelLinkScreenshots = document.querySelector(`#panel-link-screenshots`).checked;
      info.panelScreenshots = document.querySelector(`#panel-screenshots`).value;
      info.panelNoScreenshots = document.querySelector(`#panel-no-screenshots`).value;
      info.panelRating = document.querySelector(`#panel-rating`).value;
      info.panelUsePredefinedBackground = document.querySelector(`#panel-use-predefined-background`).checked;
      info.panelPredefinedBackground = document.querySelector(`#panel-predefined-background`).value;
      info.panelUseCustomBackground = document.querySelector(`#panel-use-custom-background`).checked;
      info.panelCustomBackground = document.querySelector(`#panel-custom-background`).value;
      info.panelUseCollapsibleReview = document.querySelector(`#panel-use-collapsible-review`).checked;

      info.barAchievements = document.querySelector(`#bar-achievements`).value;
      info.barNoAchievements = document.querySelector(`#bar-no-achievements`).value;
      info.barLinkAchievements = document.querySelector(`#bar-link-achievements`).checked;
      info.barLinkScreenshots = document.querySelector(`#bar-link-screenshots`).checked;
      info.barScreenshots = document.querySelector(`#bar-screenshots`).value;
      info.barNoScreenshots = document.querySelector(`#bar-no-screenshots`).value;
      info.barBackgroundType = document.querySelector(`#bar-background-type`).value;
      info.barBackground1 = document.querySelector(`#bar-background-1`).value;
      info.barBackground2 = document.querySelector(`#bar-background-2`).value;
      info.barImagePosition = document.querySelector(`#bar-image-position`).value;
      info.barCompletionBarPosition = document.querySelector(`#bar-completion-bar-position`).value;
      info.barTitleColor = document.querySelector(`#bar-title-color`).value;
      info.barTextColor = document.querySelector(`#bar-text-color`).value;
      info.barCustomText = document.querySelector(`#bar-custom-text`).value;
      info.barUseCollapsibleReview = document.querySelector(`#bar-use-collapsible-review`).checked;
      info.barReviewTriggerMethod = document.querySelector(`#bar-review-trigger-method`).value;
    }
    if (info[`${info.format}LinkScreenshots`]) {
      const screenshots = (await monkeyRequest.send(`https://steamcommunity.com/profiles/${settings.steamId}/screenshots?appid=${info.id}`)).dom.querySelectorAll(`[href*="steamcommunity.com/sharedfiles/filedetails"]`).length;
      if (screenshots > 0) {
        info.screenshots = `${screenshots} screenshots`;
      } else {
        info.screenshots = `no screenshots`;
      }
    } else {
      info.screenshots = ``;
    }
    const reviewPreview = info.review ? (await previewText(applyPgTemplate(info, info.review))).dom.querySelector(`.markdown`).outerHTML : ``;
    let html = ``;
    switch (info.format) {
      case `box`: {
        html = `
					<li class="game game-thumbnail game-${info.state}">
						<div class="title">${info.title}</div>
						<a href="https://store.steampowered.com/app/${info.id}/" target="_blank">
							<img alt="${info.title}" src="${info.image}">
						</a>
						<div class="caption" style="height: auto;">
							<p>${info.playtime}</p>
							${info.achievements === `no achievements` ? `<p class="text-muted">${applyPgTemplate(info, info.boxNoAchievements)}</p>` : (info.boxLinkAchievements ? `<a href="${applyPgTemplate(info, `https://steamcommunity.com/profiles/%steamid%/stats/%id%/?tab=achievements`)}" target="_blank">${applyPgTemplate(info, info.boxAchievements)}</a>` : `<p>${applyPgTemplate(info, info.boxAchievements)}</p>`)}
							${info.boxLinkScreenshots ? (info.screenshots === `no screenshots` ? `<p class="text-muted">${applyPgTemplate(info, info.boxNoScreenshots)}</p>` : `<p><a href="${applyPgTemplate(info, `https://steamcommunity.com/profiles/%steamid%/screenshots?appid=%id%`)}" target="_blank">${applyPgTemplate(info, info.boxScreenshots)}</a></p>`) : ``}
						</div>
					</li>
				`;
        if (info.review) {
          const box = `<span style="flex-shrink: 0;">${html}</span>`;
          const review = `<span style="font-size: 14px; width: 100%;">${reviewPreview}</span>`;
          html = `
            <div style="display: flex; justify-content: space-between;">
              ${info.boxReviewPosition === `Left` ? `
                ${review}${box}
              ` : `
                ${box}${review}
              `}
            </div>
          `;
        }
        break;
      }
      case `panel`: {
        html = `
					<div class="panel ${info.panelUsePredefinedBackground ? `panel-${panelColors[info.panelPredefinedBackground]}` : ``}" style="${info.panelUseCustomBackground ? `border-color: ${info.panelCustomBackground};` : ``} font-size: 14px;">
						<div class="panel-heading" ${info.review && info.panelUseCollapsibleReview ? `data-target="#review-${settings.username}-${info.id}" data-toggle="collapse"` : ``} style="${info.panelUseCustomBackground ? `background-color: ${info.panelCustomBackground};` : ``} display: flex; position: relative;">
							<div style="border-left: 10px solid ${completionColors[info.state]}; padding-right: 10px;">
								<img alt="${info.title}" src="https://steamcdn-a.akamaihd.net/steam/apps/${info.id}/header.jpg" style="max-height: 90px; max-width: none; min-height: 90px; width: 192.55px;">
							</div>
							<div class="media-body">
								<h4 class="media-heading">
									${info.title}
									<a href="https://store.steampowered.com/app/${info.id}" target="_blank">
                    <font size="2px">
                      <i aria-hidden="true" class="fa fa-external-link"></i>
                    </font>
									</a>
								</h4>
								${info.panelRating ? `
									<div>
										<i aria-hidden="true" class="fa fa-star"></i> ${info.panelRating}
									</div>
								` : ``}
								<div>
									<i aria-hidden="true" class="fa fa-clock-o"></i> ${info.playtime}
								</div>
								<div>
									<i aria-hidden="true" class="fa fa-trophy"></i> ${info.achievements === `no achievements` ? `<span class="text-muted">${applyPgTemplate(info, info.panelNoAchievements)}</span>` : (info.panelLinkAchievements ? `<a href="${applyPgTemplate(info, `https://steamcommunity.com/profiles/%steamid%/stats/%id%/?tab=achievements`)}" target="_blank">${applyPgTemplate(info, info.panelAchievements)}</a>` : `<span>${applyPgTemplate(info, info.panelAchievements)}</span>`)}
                </div>
                ${info.panelLinkScreenshots ? (`
                  <div>
                    <i aria-hidden="true" class="fa fa-image"></i> ${info.screenshots === `no screenshots` ? `<span class="text-muted">${applyPgTemplate(info, info.panelNoScreenshots)}</span>` : `<a href="${applyPgTemplate(info, `https://steamcommunity.com/profiles/%steamid%/screenshots?appid=%id%`)}" target="_blank">${applyPgTemplate(info, info.panelScreenshots)}</a>`}
                  </div>
                `) : ``}
                ${info.review && info.panelUseCollapsibleReview ? `
                  <div aria-expanded="false" class="collapsed" style="bottom: 10px; position: absolute; right: 10px;">More <i class="fa fa-level-down"></i></div>
                ` : ``}
							</div>
            </div>
            ${info.review ?
            info.panelUseCollapsibleReview ? `
                <div class="collapse" id="review-${settings.username}-${info.id}" style="padding: 10px 20px; width: 100%;">${reviewPreview}</div>
              ` : `
                <div style="padding: 10px 20px; width: 100%;">${reviewPreview}</div>
              `
            : ``}
					</div>
				`;
        break;
      }
      case `bar`: {
        const image = `
          <a href="https://store.steampowered.com/app/${info.id}/" target="_blank">
            <img src="${info.image}" style="max-width: none;">
          </a>
        `;
        const details = `
          <div style="padding-left: 5px; width: 100%;">
            <h2 style="color: ${info.barTitleColor}; font-size: 22px; margin: 0; padding-top: 5px;">${info.title}</h2>
            <p style="color: ${info.barTextColor}; font-size: 10px; margin-bottom: 0; padding-bottom: 5px;">${info.playtime}, ${info.achievements === `no achievements` ? `<span class="text-muted">${applyPgTemplate(info, info.barNoAchievements)}</span>` : (info.barLinkAchievements ? `<a href="${applyPgTemplate(info, `https://steamcommunity.com/profiles/%steamid%/stats/%id%/?tab=achievements`)}" target="_blank">${applyPgTemplate(info, info.barAchievements)}</a>` : `<span>${applyPgTemplate(info, info.barAchievements)}</span>`)}${info.barLinkScreenshots ? `, ${info.screenshots === `no screenshots` ? `<span class="text-muted">${applyPgTemplate(info, info.barNoScreenshots)}</span>` : `<a href="${applyPgTemplate(info, `https://steamcommunity.com/profiles/%steamid%/screenshots?appid=%id%`)}" target="_blank">${applyPgTemplate(info, info.barScreenshots)}</a>`}` : ``}</p>
          </div>
        `;
        html = `
          <div ${info.review && info.barUseCollapsibleReview && info.barReviewTriggerMethod === `Bar Click` ? `data-target="#review-${settings.username}-${info.id}" data-toggle="collapse"` : ``} style="${info.barBackgroundType === `Solid` ? `background-color: ${info.barBackground1};` : `background: linear-gradient(to ${info.barBackgroundType === `Horizontal Gradient` ? `right` : `bottom`}, ${info.barBackground1}, ${info.barBackground2});`} ${info.barCompletionBarPosition === `Hidden` ? `` : `border-${info.barCompletionBarPosition.toLowerCase()}: 10px solid ${completionColors[info.state]};`} ${info.review && info.barUseCollapsibleReview && info.barReviewTriggerMethod === `Bar Click` ? `cursor: pointer;` : ``} font-size: 14px; position: relative; text-shadow: 1px 1px 0 black;">
            <div style="display: flex; justify-content: space-between;">
              ${info.barImagePosition === `Left` ? `
                ${image}${details}
              ` : `
                ${details}${image}
              `}
            </div>
            ${info.review && info.barUseCollapsibleReview && info.barReviewTriggerMethod === `Button Click` ? `
              <div data-target="#review-${settings.username}-${info.id}" data-toggle="collapse" style="background-color: #aaaaaa; border-radius: 8px; bottom: -15px; color: #ffffff; cursor: pointer; height: 22px; left: 0; margin: 0 auto; position: absolute; right: 0; text-align: center; width: 150px; z-index: 1;">
                <h2 style="font-size: 16px; line-height: 16px; margin: 0; padding-top: 2px;">
                  More <i class="fa fa-level-down"></i>
                </h2>
              </div>
            ` : ``}
          </div>
          ${info.review ?
            info.barUseCollapsibleReview ? `
              <div class="collapse" id="review-${settings.username}-${info.id}" style="border: 1px solid #dee2e6; border-radius: 2px; border-top: 0; font-size: 14px; padding: ${info.barReviewTriggerMethod === `Bar Click` ? `10px 20px 0px 20px` : `15px 20px 0px`}; width: 100%;">${reviewPreview}</div>
            ` : `
              <div style="border: 1px solid #dee2e6; border-radius: 2px; border-top: 0; padding: 10px 20px; width: 100%;">${reviewPreview}</div>
            `
            : ``}
        `;
        break;
      }
      case `custom`: {
        if (generatorElement) {
          info.customHtml = document.querySelector(`#custom-html`).value;
        }
        html = applyPgTemplate(info, info.customHtml).replace(/%review%/g, reviewPreview);
        break;
      }
    }
    if (generatorElement) {
      const generatorPreview = document.querySelector(`#generator-preview`);
      generatorPreview.parentElement.style.display = `block`;
      generatorPreview.innerHTML = `
        <ul class="games">${html}</ul>
      `;
    }
    if (items) {
      const htmlToShow = `
        <span data-info="${escapeHtml(JSON.stringify(info))}" data-items-index="${items.toSave.length - 1}">${html}</span>
        <div class="btn-toolbar" style="margin: 10px 0 10px">
          <button class="btn btn-default edit" type="button">Edit</button>
          <button class="btn btn-default remove" type="button">Remove</button>
        </div>
      `;
      if (itemsIndex) {
        items.cache[itemsIndex - 1] = info;
        items.toSave[itemsIndex] = html;
        items.toShow[itemsIndex] = htmlToShow;
      } else {
        itemsIndex = items.toSave.length - 1;
        if (generatorElement) {
          items.cache.push(info);
        }
        items.toSave.splice(itemsIndex, 0, html);
        items.toShow.splice(itemsIndex, 0, htmlToShow);
      }
      if (generatorElement) {
        window.localStorage.enhancedBlaeo_pg = JSON.stringify(items.cache);
      }
      const generatorResult = document.querySelector(`#generator-result`);
      generatorResult.parentElement.style.display = `block`;
      generatorResult.innerHTML = items.toShow.join(``);
      const editButtons = generatorResult.querySelectorAll(`.edit`);
      for (const button of editButtons) {
        button.addEventListener(`click`, () => selectPgGame(null, defaultInfo, JSON.parse(button.parentElement.previousElementSibling.getAttribute(`data-info`)), items, parseInt(button.parentElement.previousElementSibling.getAttribute(`data-items-index`))));
      }
      const removeButtons = generatorResult.querySelectorAll(`.remove`);
      for (const button of removeButtons) {
        button.addEventListener(`click`, () => removePgGame(button, items));
      }
    }
  }

  function previewText(text) {
    const body = `authenticity_token=${document.querySelector(`[name="authenticity_token"]`).value}&utf8=${document.querySelector(`[name="utf8"]`).value}&post[text]=${encodeURIComponent(text)}`;
    return monkeyRequest.send(`${url}/posts/preview.${settings.username}`, {
      body,
      headers: {
        'Content-Type': `application/x-www-form-urlencoded; charset=UTF-8`,
        'X-CSRF-Token': document.querySelector(`[name="csrf-token"]`).content
      },
      method: `POST`
    });
  }

  function applyPgTemplate(info, text) {
    const achievements_match = (info.achievements || ``).match(/(\d+?)\sof\s(\d+)/);
    const [achievements_count, achievements_total] = achievements_match ? [parseInt(achievements_match[1]), parseInt(achievements_match[2])] : [0, 0];
    const achievements_percentage = achievements_total > 0 ? Math.round(achievements_count / achievements_total * 10000) / 100 : 0;
    const screenshots_match = (info.screenshots || ``).match(/\d+/);
    const screenshots_count = screenshots_match ? parseInt(screenshots_match[0]) : 0;
    return (text || ``)
      .replace(/%steamid%/g, settings.steamId)
      .replace(/%username%/g, settings.username)
      .replace(/%state%/g, info.state)
      .replace(/%image%/g, info.image)
      .replace(/%title%/g, info.title)
      .replace(/%id%/g, info.id)
      .replace(/%playtime%/g, info.playtime)
      .replace(/%achievements%/g, info.achievements)
      .replace(/%achievements_count%/g, achievements_count)
      .replace(/%achievements_total%/g, achievements_total)
      .replace(/%achievements_percentage%/g, achievements_percentage)
      .replace(/%screenshots%/g, info.screenshots)
      .replace(/%screenshots_count%/g, screenshots_count);
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, `&amp;`)
      .replace(/</g, `&lt;`)
      .replace(/>/g, `&gt;`)
      .replace(/"/g, `&quot;`)
      .replace(/'/g, `&#039;`);
  }

  function removePgGame(button, items) {
    const index = parseInt(button.parentElement.previousElementSibling.getAttribute(`data-items-index`));
    items.cache[index - 1] = null;
    items.toSave[index] = ``;
    items.toShow[index] = ``;
    window.localStorage.enhancedBlaeo_pg = JSON.stringify(items.cache);
    button.parentElement.previousElementSibling.remove();
    button.parentElement.remove();
  }

  async function savePgPreset(info) {
    const presetButton = document.querySelector(`#preset-button`);
    presetButton.textContent = `Saving...`;
    const name = document.querySelector(`#preset-name`).value || `UntitledPreset${settings.pgPresets.length + 1}`;
    const preset = settings.pgPresets.filter(x => x.name === name)[0] || (settings.pgPresets.push({ name }) && settings.pgPresets[settings.pgPresets.length - 1]);
    preset.format = info.format;
    preset.review = info.review;
    switch (preset.format) {
      case `box`:
        preset.boxAchievements = info.boxAchievements;
        preset.boxNoAchievements = info.boxNoAchievements;
        preset.boxLinkAchievements = info.boxLinkAchievements;
        preset.boxLinkScreenshots = info.boxLinkScreenshots;
        preset.boxScreenshots = info.boxScreenshots;
        preset.boxNoScreenshots = info.boxNoScreenshots;
        preset.boxReviewPosition = info.boxReviewPosition;
        break;
      case `panel`:
        preset.panelAchievements = info.panelAchievements;
        preset.panelNoAchievements = info.panelNoAchievements;
        preset.panelLinkAchievements = info.panelLinkAchievements;
        preset.panelLinkScreenshots = info.panelLinkScreenshots;
        preset.panelScreenshots = info.panelScreenshots;
        preset.panelNoScreenshots = info.panelNoScreenshots;
        preset.panelRating = info.panelRating;
        preset.panelUsePredefinedBackground = info.panelUsePredefinedBackground;
        preset.panelPredefinedBackground = info.panelPredefinedBackground;
        preset.panelUseCustomBackground = info.panelUseCustomBackground;
        preset.panelCustomBackground = info.panelCustomBackground;
        preset.panelUseCollapsibleReview = info.panelUseCollapsibleReview;
        break;
      case `bar`:
        preset.barAchievements = info.barAchievements;
        preset.barNoAchievements = info.barNoAchievements;
        preset.barLinkAchievements = info.barLinkAchievements;
        preset.barLinkScreenshots = info.barLinkScreenshots;
        preset.barScreenshots = info.barScreenshots;
        preset.barNoScreenshots = info.barNoScreenshots;
        preset.barBackgroundType = info.barBackgroundType;
        preset.barBackground1 = info.barBackground1;
        preset.barBackground2 = info.barBackground2;
        preset.barImagePosition = info.barImagePosition;
        preset.barCompletionBarPosition = info.barCompletionBarPosition;
        preset.barTitleColor = info.barTitleColor;
        preset.barTextColor = info.barTextColor;
        preset.barCustomText = info.barCustomText;
        preset.barUseCollapsibleReview = info.barUseCollapsibleReview;
        preset.barReviewTriggerMethod = info.barReviewTriggerMethod;
        break;
      case `custom`:
        preset.customHtml = info.customHtml;
    }
    await GM.setValue(`pgPresets`, JSON.stringify(settings.pgPresets));
    window.alert(`Preset saved!`);
    presetButton.textContent = `Save Preset`;
  }

  // [TLC] Theme List Checker

  async function getTlcList() {
    const currentMonth = getCurrentMonth();
    const dom = (await monkeyRequest.send(`${url}/themes/${currentMonth}`)).dom;
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
      const id = parseInt(element.getAttribute(`href`).match(/store\.steampowered\.com\/(app|sub)\/(\d+)/)[2]);
      if (settings.tlcGames.indexOf(id) < 0) {
        settings.tlcGames.push(id);
        tagTlcNew(element);
      }
      if (settings.ownedGames.indexOf(id) > -1) {
        tagTlcOwned(element);
      }
      games[id] = element;
    }
    await GM.setValue(`tlcGames`, JSON.stringify(settings.tlcGames));
    await tagTlcStatus(`#5cb85c`, games, `Beaten`, `beaten`);
    await tagTlcStatus(`#5bc0de`, games, `Completed`, `completed`);
    await tagTlcStatus(`#f0ad4e`, games, `Unfinished`, `unfinished`);
    await tagTlcStatus(`#d9534f`, games, `Won't Play`, `wont-play`);
    document.querySelector(`[id*="counter"]`).innerHTML = `
      <font size="4">
          <b>${elements.length} Games</b>
      </font>
    `;
  }

  function tagTlcNew(element) {
    element.insertAdjacentHTML(`afterEnd`, `
      <b style="color: #555555;"> [New]</b>
    `);
  }

  function tagTlcOwned(element) {
    element.insertAdjacentHTML(`afterEnd`, `
      <b style="color: #555555;"> [Owned]</b>
    `);
  }

  async function tagTlcStatus(color, games, status, key) {
    const dom = (await monkeyRequest.send(`${url}/users/+${settings.steamId}/games/${key}`)).dom;
    if (dom) {
      const elements = dom.querySelectorAll(`.steam`);
      const ids = new Set();
      for (const element of elements) {
        ids.add(element.getAttribute(`href`).match(/\d+/)[0]);
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
