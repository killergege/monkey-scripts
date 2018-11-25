const monkeyDomParser = (() => {
  const domParser = new DOMParser();

  return {
    parse(string) {
      return domParser.parseFromString(string, `text/html`);
    }
  };
})();