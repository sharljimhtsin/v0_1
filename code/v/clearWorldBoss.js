/**
 * Created by xiazhengxin on 2015/10/10 18:55.
 */

var jutil = require("../utils/jutil");
var async = require("async");
var redis = require("../../code/alien/db/redis");

function start(postData, response, query) {
    var countryList = ['i'];
    async.forEachSeries(countryList, function (country, forCb) {
        console.log(country, 'start');
        var serverList = require("../../config/" + country + "_server.json")["serverList"];
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
        if (err) {
            echo(jutil.errorInfo(err));
        } else {
            echo("OK");
        }
    });
    function echo(data) {
        var str = JSON.stringify(data);
        if (query != '' && query.callback != undefined) {
            response.end(query.callback + '(' + str + ')', "utf-8");
        } else {
            response.end(str, "utf-8");
        }
    }
}

exports.start = start;