var request = require('request');
var fs = require('fs');
var async = require('async');

var subscribers = function() {
  var toSend = fs.readFileSync('data/subscribers.json');

  JSON.parse(toSend).forEach(function(params) {
    request({
      method: 'POST',
      url: 'http://localhost:8181/subscribe',
      body: JSON.stringify(params),
      headers: {
        'content-type': 'application/json'
      }
    }, function(err, resp) {
      //console.log(resp.body);
    })
  });

};

var notifications = function(params) {

  var toSend = fs.readFileSync('data/notifications.json');
  
  JSON.parse(toSend).forEach(function(params) {
    request({
      method: 'POST',
      url: 'http://localhost:8181/notifications',
      body: JSON.stringify(params),
      headers: {
        'content-type': 'application/json'
      }
    }, function(err, resp) {
      console.log(resp.body);
    })
  });

}

subscribers(); 
setTimeout(notifications, 5000);