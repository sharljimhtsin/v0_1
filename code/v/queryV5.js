/**
 * Created by xiazhengxin on 2016/3/15 7:35.
 */

var jutil = require("../utils/jutil");
var mysql = require("../alien/db/mysql");
var async = require("async");

function start(postData, response, query) {
    var country = "i";
    var cityList = [];
    var returnData = "";
    if (jutil.postCheck(query, "st", "et") == false) {
        returnData = "postError";
        response.end(returnData, "utf-8");
        return;
    }
    var st = query["st"];
    var et = query["et"];
    async.series([function (cb) {
        var serverList = require("../../config/" + country + "_server.json")["serverList"];
        for (var city in serverList) {
            cityList.push(city);
        }
        cb();
    }, function (cb) {
        var dataSwap;
        var sql = "SELECT * FROM `user` as a LEFT JOIN `variable` as b ON a.`userUid` = b.`userUid` AND a.`vip` >= 5 WHERE b.`name` = 'loginLog' and b.`time` between " + st + " and " + et;
        async.forEachSeries(cityList, function (city, forCb) {
            async.series([function (queueCb) {
                mysql.game(null, country, city).query(sql, function (err, res) {
                    dataSwap = res;
                    queueCb(err);
                });
            }, function (queueCb) {
                for (var i in dataSwap) {
                    var item = dataSwap[i];
                    var rowArr = [];
                    rowArr.push(country);
                    rowArr.push(city);
                    rowArr.push(item["userUid"]);
                    rowArr.push(item["lv"]);
                    rowArr.push(item["vip"]);
                    rowArr.push(item["platformId"]);
                    rowArr.push(item["pUserId"]);
                    rowArr.push(item["time"]);
                    returnData += rowArr.join(",");
                    returnData += "\n";
                }
                queueCb();
            }], forCb);
        }, cb);
    }], function (err, res) {
        response.end(returnData, "utf-8");
    });
}

exports.start = start;
