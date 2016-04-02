var express = require('express');
var MongoClient = require('mongodb').MongoClient
var bodyParser = require('body-parser');

var port = 8181;
var app = express();
var mongoUrl = "mongodb://localhost:27017/pushathon";
var mongoDB = null;

app.use(bodyParser.json());

app.post('/subscribe', function(req, res) {
    var body = req.body;

    var params = { "subscriber_id": body.subscriber_id, "site_id": body.site_id };

    var subscribersCollection = mongoDB.collection("subscribers");

    subscribersCollection.find(params).toArray(function(err, data) {
        if (err) return console.error(err);

        if (data.length) {
            res.send({ "error": null, "existing": true, "message": "You have already subscribed to this channel" });
        } else {

            subscribersCollection.insert(body, function() {
                if (err) {
                    console.error(err);
                    res.send({ "error": true, "message": "Failed to subscribe to the channel" });
                    return;
                }
                res.send({ "error": null, "existing": false, "message": "You have successfully subscribed to this channel" });
            })

        }
    });
});

var operator = ['=', '!=', '>', '<', '>=', '<='];
var operatorWord = ['eq', 'neq', 'gt', 'lt', 'gte', 'lte'];

var checkIfEmpty = function(data) {
    return (!data || data == "")
}

app.post('/notifications', function(req, res) {
    var body = req.body;
    var params = {}, message = [];

    if (checkIfEmpty(body.notification_title)) {
        message.push("Notification Title is missing");
    }

    if (checkIfEmpty(body.notification_message)) {
        message.push("Notification Message is missing");
    }

    if (checkIfEmpty(body.notification_url)) {
        message.push("Notification URL is missing");
    }

    if (message.length) {
        res.send({ "success": false, "message": message.join(', ') });
    }

    body.notification_criteria.forEach(function(param) {
        var key = operatorWord[operator.indexOf(param.condition)];
        params[param.parameter] = {};
        params[param.parameter]['$' + key] = param.value;
    });

    console.log(params);

    var subscribersCollection = mongoDB.collection("subscribers");
    var notificationsCollection = mongoDB.collection("notifications");

    subscribersCollection.find(params, { 'subscriber_id': true, '_id': false }).toArray(function(err, data) {
        if (err) return console.error(err);

        var subscribers = data;

        delete body.notification_criteria;
        body.subscribers = subscribers.map(function(subscriber) { return { subscriber: subscriber.subscriber_id, read: false } });

        notificationsCollection.insert(body, function(err, data) {
            if (err) return console.error(err);

            //call external api here

            res.send({ "success": true, "message": "Notifications added" });
        });


    });

});

app.get('/notifications', function(req, res) {

    var subscriber_id = req.query.subscriber_id;

    console.log(subscriber_id);

    var notificationsCollection = mongoDB.collection("notifications");
    var subscribersCollection = mongoDB.collection("subscribers");

    notificationsCollection.find({ subscribers: { '$elemMatch': { subscriber: subscriber_id, read: false } } }, { subscribers: false }).toArray(function(err, data) {
        if (err) return console.error(err);

        console.log(data);

        var resp = data.map(function(row) {
            return {
                title: row.notification_title,
                body: row.notification_message,
                url: row.notification_url,
                tag: row._id
            }
        });

        notificationsCollection.update({ subscribers: { '$elemMatch': { subscriber: subscriber_id } } }, { '$inc': { 'view_count': 1 }, '$set': { 'subscribers.$.read': true } }, { multi: true }, function(err, data) {
            res.send(resp);
        });

    });

})

app.listen(port, function() {
    console.log("Server is running");
    MongoClient.connect(mongoUrl, function(err, db) {
        if (err) {
            console.log("Error in connecting to mongodb", err)
        }
        console.log("connected to mongoDB");
        mongoDB = db;

    });
});

