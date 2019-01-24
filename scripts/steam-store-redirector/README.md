# Steam Store Redirector

Redirects removed games from the Steam store to SteamCommunity or SteamDB.

### [Install](https://raw.githubusercontent.com/gsrafael01/monkey-scripts/3.1.0/scripts/steam-store-redirector/steam-store-redirector.user.js)

---

## Features

* Adds "#app_[ID]" or "#sub_[ID]" to the end of all links to the Steam store in the page. This way, when you open the link, if the game has been removed from the store you will be redirected to the main store page, but the hash will remain in the URL, allowing the script to detect that the game was removed and redirect you to SteamCommunity or SteamDB.
* Redirects to SteamCommunity by default (it can be changed in the [settings](https://steamcommunity.com/?steamStoreRedirector=settings));

---

## Examples

* [Dead Island](http://store.steampowered.com/app/91310)
* [Temper Tantrum](http://store.steampowered.com/app/373110)