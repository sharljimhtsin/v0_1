/**
 * Created by xiayanxin on 2016/4/2.
 */

var jutil = require("../code/utils/jutil");
var async = require("async");
var redis = require("../code/alien/db/redis");
var mysql = require("../code/alien/db/mysql");
var fs = require("fs");
var countryList = ['i'];
var dataSwap;
var csv = "country,city,userUid,userName,platformId,\n";
async.forEachSeries(countryList, function (country, forCb) {
    console.log(country, 'start');
    var serverList = require("../config/" + country + "_server.json")["serverList"];
    var cityList = [];
    for (var city in serverList) {
        cityList.push(city);
    }
    async.forEachSeries(cityList, function (city, cb) {
        async.series([function (queueCb) {
            var now = jutil.now();
            var oneMonthAgo = now - 60 * 60 * 24 * 30;
            var sql = "SELECT * FROM `variable` as v,`user` as u WHERE u.`userUid` = v.`userUid` and v.`name` = 'loginLog' and v.`time` < " + oneMonthAgo;
            mysql.game(null, country, city).query(sql, function (err, res) {
                if (err) {
                    console.log(city, err);
                    queueCb(null);
                } else {
                    dataSwap = res;
                    queueCb(null);
                    //mysql.game(null, country, city).end(queueCb); // if no db connect request later
                }
            });
        }, function (queueCb) {
            for (var row in dataSwap) {
                row = dataSwap[row];
                //var rowArr = [];
                //rowArr.push(country);
                //rowArr.push(city);
                //rowArr.push(row["userUid"]);
                //csv += rowArr.join(",");
                csv += row["userUid"];
                csv += "\n";
            }
            queueCb();
        }, function (queueCb) {
            async.eachSeries(dataSwap, function (row, esCb) {
                var userUid = row["userUid"];
                async.series([function (seCb) {
                    redis.user(userUid).h("*").del(seCb);
                }, function (seCb) {
                    redis.user(userUid).s("*").del(seCb);
                }, function (seCb) {
                    redis.user(userUid).l("*").del(seCb);
                }], esCb);
            }, function (err, res) {
                queueCb(err);
            });
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
    console.log('write file start');
    fs.writeFileSync("tableExport.csv", csv);
    console.log('write file end');
    console.log("OK");
    process.exit();
});