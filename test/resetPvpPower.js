/**
 * Created by xiazhengxin on 2017/6/6.
 */

var async = require("async");
var mysql = require("../code/alien/db/mysql");
var countryList = ['r'];
async.forEachSeries(countryList, function (country, forCb) {
    console.log(country, 'start');
    var serverList = require("../config/" + country + "_server.json")["serverList"];
    var cityList = [];
    for (var city in serverList) {
        cityList.push(city);
    }
    async.forEachSeries(cityList, function (city, cb) {
        async.series([function (queueCb) {
            var sql = "select count(*) as ct from `user` where `pvpPower` < 0;";
            mysql.game(null, country, city).query(sql, function (err, res) {
                if (err) {
                    console.log(city, err);
                    queueCb();
                } else {
                    console.log(res);
                    queueCb();
                    //mysql.game(null, country, city).end(queueCb); // if no db connect request later
                }
            });
        }, function (queueCb) {
            var sql = "update `user` set `pvpPower` = 0 where `pvpPower` < 0;";
            mysql.game(null, country, city).query(sql, function (err, res) {
                if (err) {
                    console.log(city, err);
                    queueCb();
                } else {
                    console.log(res);
                    queueCb();
                    //mysql.game(null, country, city).end(queueCb); // if no db connect request later
                }
            });
        }, function (queueCb) {
            queueCb();
        }, function (queueCb) {
            queueCb();
        }, function (queueCb) {
            queueCb();
        }], function () {
            cb();
        });
    }, function () {
        console.log(country, 'end');
        forCb();
    });
}, function () {
    console.log("OK");
    process.exit();
});