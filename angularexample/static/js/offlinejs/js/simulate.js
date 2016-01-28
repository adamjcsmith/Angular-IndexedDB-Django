(function() {
  var base, i, len, ref, state;

  if (!Offline) {
    throw new Error("Offline simulate brought in without offline.js");
  }

  ref = ['up', 'down'];
  for (i = 0, len = ref.length; i < len; i++) {
    state = ref[i];
    if (document.querySelector("script[data-simulate='" + state + "']") || (typeof localStorage !== "undefined" && localStorage !== null ? localStorage.OFFLINE_SIMULATE : void 0) === state) {
      if (Offline.options == null) {
        Offline.options = {};
      }
      if ((base = Offline.options).checks == null) {
        base.checks = {};
      }
      Offline.options.checks.active = state;
    }
  }

}).call(this);
