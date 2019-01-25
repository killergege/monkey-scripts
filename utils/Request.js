// Make sure to add this metadata to the main script:
// @grant GM.xmlHttpRequest
// @grant GM_xmlhttpRequest
// @require https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js
//
// Also add any external domains used in the main script to the @connect list, for example:
// @connect external-domain-1.example
// @connect external-domain-2.example
const monkeyRequest = {
  async send(url, options = {}) {
    return new Promise(resolve => {
      if (url.match(window.location.host)) {
        const response = await window.fetch(url, options);
        const text = await response.text();
        const responseObj = { text, url: response.url };
        try {
          responseObj.dom = monkeyDomParser.parse(text);
        } catch (error) {
          responseObj.dom = null;
        }
        try {
          responseObj.json = JSON.parse(text);
        } catch (error) {
          responseObj.json = null;
        }
        resolve(responseObj);
      } else {
        GM.xmlHttpRequest(Object.assign({
          method: `GET`,
          url,
          onload: response => {
            const text = response.responseText;
            const responseObj = { text, url: response.finalUrl };
            try {
              responseObj.dom = monkeyDomParser.parse(text);
            } catch (error) {
              responseObj.dom = null;
            }
            try {
              responseObj.json = JSON.parse(text);
            } catch (error) {
              responseObj.json = null;
            }
            resolve(responseObj);
          }
        }, options));
      }
    });
  }
};