var reference = require('./reference');
var mustache = require('mustache');

var messages = module.exports = {
  addCustomRuleset: function(customRules) {
    reference = Object.assign(reference, customRules);
  },

  parseBool: function(s) {
    s = s.toLowerCase();
    if (s === 'off' || s === 'false' || s === '0' || s === 'n') {
      return false;
    }

    return true;
  },

  build: function (rules, name, line, data) {
    if (name in rules) {
      if (!messages.parseBool(rules[name])) {
        return null;
      }
    }
    var message = {};
    if (name in reference) {
      const messageData = Object.assign({}, reference[name]);
      messageData['description'] = mustache.render(messageData.description, data);
      messageData['title'] = mustache.render(messageData.title, data);
      Object.assign(message, messageData);
    } else {
      message.title = name;
      message.description = 'No description for message';
    }

    message.line = line;
    message.rule = name;
    return message;
  }
};
