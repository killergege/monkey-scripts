const monkeyRequest = {
  async send(url, options) {
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
    return responseObj;
  }
};