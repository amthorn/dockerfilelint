var reference = require('./reference');

String.prototype.format = function () {
  var a = this;
  for (var k of Object.values(arguments)) {
    if (k) {
      for (var j of Object.keys(k)) {
        a = a.replace(new RegExp("\\{" + j + "\\}", 'g'), k[j]);
      }
    }
  }
  return a
}

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
      messageData['description'] = messageData.description.format(data);
      messageData['title'] = messageData.title.format(data);
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
