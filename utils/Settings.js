// Make sure to add this to the main script:
// @grant GM.info
// @grant GM.getValue
// @grant GM.setValue
// @grant GM_info
// @grant GM_getValue
// @grant GM_setValue
// @require https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js

const monkeySettings = {
  name: GM.info.script.name,
  namespace: GM.info.script.namespace,

  async init(options, useLocalStorage = false) {
    this.options = options;
    this.useLocalStorage = useLocalStorage;
    this.settings = JSON.parse(await this.get(this.namespace, `{}`));
    this.url = GM.info.script.matches[0].replace(/\*/, `?${this.namespace}=settings`);
    await this.check();
  },

  async check() {
    if (!Object.keys(this.settings).length) {
      await this.open(true);
    } else if (window.location.search === `?${this.namespace}=settings`) {
      await this.open();
    }
  },

  async open(firstRun) {
    for (const option of this.options) {
      if (option.isNumber) {
        let value = 0.0;
        do {
          value = parseFloat(firstRun ? option.defaultValue : prompt(`${this.name} Settings\n\n${option.message} Enter the number from ${option.min} to ${option.max}.`));
        } while (value < option.min || value > option.max);
        this.settings[option.id] = value;
      } else if (option.isText) {
        this.settings[option.id] = firstRun ? option.defaultValue : prompt(`${this.name} Settings\n\n${option.message} Enter the text.`);
      } else {
        let value = null;
        do {
          if (firstRun) {
            value = option.defaultValue;
          } else {
            value = prompt(`${this.name} Settings\n\n${option.message} Type ${option.values.map(x => x.template.replace(/%/, x.key)).join(` or `)}.`);
            value = option.values.filter(x => x.key === value)[0];
          }
        } while (!value);
        this.settings[option.id] = value.value;
      }
    }
    await this.set(this.namespace, this.settings);
    if (!firstRun) {
      alert(`Settings saved!`);
    }
  },

  getSetting(key) {
    return this.settings[key];
  },

  get(key, defaultValue) {
    if (this.useLocalStorage) {
      return window.localStorage[key] || defaultValue;
    } else {
      return GM.getValue(key, defaultValue);
    }
  },

  set(key, value) {
    if (this.useLocalStorage) {
      window.localStorage[key] = JSON.stringify(value);
    } else {
      return GM.setValue(key, JSON.stringify(value));
    }
  }
};