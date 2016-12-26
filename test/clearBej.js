/**
 * Created by xiazhengxin on 2016/11/30.
 */

var mysql = require("../code/alien/db/mysql");
var redis = require("../code/alien/db/redis");
var async = require("async");
var countryList = ['i'];
var sql;

async.forEachSeries(countryList, function (country, forCb) {
    console.log(country, 'start');
    var serverList = require("../config/" + country + "_server.json")["serverList"];
    var cityList = [];
    for (var city in serverList) {
        if (parseInt(city) > 70) {
            cityList.push(city);
        }
    }
    async.forEachSeries(cityList, function (city, cb) {
        async.series([function (queueCb) {
            sql = "delete  FROM `activityData` WHERE `type` = 57";
            mysql.game(null, country, city).query(sql, function (err, res) {
                if (err) {
                    console.log(city, err);
                    queueCb(null);
                } else {
                    queueCb();
                    //mysql.game(null, country, city).end(queueCb); // if no db connect request later
                }
            });
        }], function (err, res) {
            console.log(country, city, 'end');
            cb(err);
        });
    }, function (err) {
        console.log(country, 'end');
        forCb(null);
    });
}, function (err) {
    console.log(err);
    process.exit();
});