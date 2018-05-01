// ==UserScript==
// @author revilheart
// @description Helps automate the process of adding users to the BLAEO website.
// @grant none
// @match https://www.backlog-assassins.net/admin/users/new*
// @name BlaeoTools: Admin - Add User
// @namespace BlaeoTools
// @version 1.0
// ==/UserScript==

init();

async function init() {
    const steamId = location.search.match(/\d+/)[0],
          key = `blaeoTools_${steamId}`;
    if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        window.close();
        return;
    }
    localStorage.setItem(key, 1);
    (await getElement(`[name=q]`)).value = steamId;
    (await getElement(`.btn-default`)).click();
    const alert = await getElement(`.alert`);
    if (!alert.classList.contains(`alert-success`)) {
        localStorage.removeItem(key);
        window.close();
        return;
    }
    (await getElement(`.btn-primary:not([disabled])`)).click();
}

function getElement(query) {
    return new Promise((resolve, reject) => {
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
