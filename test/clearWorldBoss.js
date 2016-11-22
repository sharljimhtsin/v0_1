/**
 * Created by xiazhengxin on 2015/11/13 2:57.
 */

var jutil = require("../code/utils/jutil");
var async = require("async");
var redis = require("../code/alien/db/redis");

var countryList = ['i'];
async.forEachSeries(countryList, function (country, forCb) {
    console.log(country, 'start');
    var serverList = require("../config/" + country + "_server.json")["serverList"];
    var cityList = [];
    for (var city in serverList) {
        cityList.push(city);
    }
    async.forEachSeries(cityList, function (city, cb) {
        async.series([function (queueCb) {
            var gDay = jutil.day(); //当前时间 (天)
            var keyName = "worldBS:" + gDay; //worldBoosStatus
            redis.domain(country, city).s(keyName).del(function (err, res) {
                console.log("OK");
                queueCb();
            });
        }, function (queueCb) {
            queueCb();
        }, function (queueCb) {
            queueCb();
        }, function (queueCb) {
            queueCb();
        }, function (queueCb) {
            queueCb();
        }], function (err, res) {
            cb();
        });
    }, function (err) {
        console.log(country, 'end');
        forCb(null);
    });
}, function (err) {
    console.log("OK");
    process.exit();
});