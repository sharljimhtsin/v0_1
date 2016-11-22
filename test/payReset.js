/**
 * 被重置的充值记录的恢复。提取payOrder记录写入首充和充值总额记录
 */

var mysql = require("../code/alien/db/mysql");
var redis = require("../code/alien/db/redis");
var userVariable = require("../code/model/userVariable");
var async = require("async");

var countryList = ['c'];
var sql = "SELECT `userUid` FROM `variable` WHERE  `name` = 'totalCharge' AND `value` > 0";

async.forEachSeries(countryList, function(country, forCb) {
    console.log(country, 'start');
    var serverList = require("../config/" + country + "_server.json")["serverList"];
    var cityList = [];
    for(var city in serverList){
        cityList.push(city);
    }
    async.forEachSeries(cityList, function(city, cb) {
        console.log(country, city, 'start');
        mysql.game(null, country, city).query(sql, function(err, res) {
            if (err) {
                console.log(city,  err);
                cb(null);
            } else {
                async.forEach(res, function(user, forCb1) {
                    var userUid = user["userUid"];
                    var sql2 = "delete from `variable` where `userUid` = '"+userUid+"' and `name` = 'isFirstCharge'";
                    mysql.game(userUid).query(sql2, function(err, res) {
                        if (err) {
                            console.log("ERROR", err);
                        }
                        console.log(res);
                        redis.user(userUid).h("variable").hdel("isFirstCharge", function(err,res) {
                            forCb1(null);
                        });
                    });

                }, function(err, res) {
                    console.log(country, city, 'end');
                    mysql.game(null, country, city).end(cb);
                });
            }
        });
    }, function(err) {
        console.log(country, 'end');
        forCb(null);
    });
}, function(err) {
    console.log('all end');
});
