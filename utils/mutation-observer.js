const monkeyMutationObserver = (() => {
  function process(mutations) {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        try {
          callback(node);
        } catch (error) {
          console.log(error);
        }
      }
    }
  }

  return {
    init(element, callback) {
      (new MutationObserver(mutations => process(mutations, callback))).observe(element, {
        attributes: true,
        childList: true,
        subtree: true
      });
    }
  };
})();