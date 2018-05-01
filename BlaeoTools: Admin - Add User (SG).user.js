// ==UserScript==
// @author revilheart
// @description Helps automate the process of adding users to the BLAEO website.
// @grant GM.xmlHttpRequest
// @match https://www.steamgifts.com/discussion/b9XQO/*
// @name BlaeoTools: Admin - Add User (SG)
// @namespace BlaeoTools
// @version 1.0
// ==/UserScript==

const elements = document.getElementsByClassName(`comment__username`);
for (const element of elements) {
    const username = element.textContent.trim();
    element.insertAdjacentHTML(`beforeEnd`, `
        <img src="https://www.backlog-assassins.net/logo-32x32.png" height="12" style="cursor: pointer;" title="Add user to BLAEO">
    `);
    const button = element.lastElementChild;
    button.addEventListener(`click`, async () => {
        let success = 1;
        try {
            window.open(`https://www.backlog-assassins.net/admin/users/new?steamId=${new DOMParser()
                .parseFromString((await (await fetch(`https://www.steamgifts.com/user/${username}`)).text()), `text/html`)
                .querySelector(`[href*="/profiles/"]`).getAttribute(`href`).match(/\d+/)[0]
            }`, null, `height=100,width=100`);
        } catch (e) {
            success = 0;
            window.alert(`An error occurred when adding ${username}...`);
        }
        if (success) {
            button.remove();
        }
    });
}
