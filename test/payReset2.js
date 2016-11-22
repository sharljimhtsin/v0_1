/**
 * 被重置的充值记录的恢复。提取payOrder记录写入首充和充值总额记录
 */



var mysql = require("../code/alien/db/mysql");
var redis = require("../code/alien/db/redis");
var userVariable = require("../code/model/userVariable");
var user = require("../code/model/user");
var async = require("async");
var configManager = require("../code/config/configManager");


var mArgv = process.argv;

if (mArgv.length < 4){
    return;
}


var server = mArgv[3];
var serverSE = server.split("_");
var serverS = 1;
var serverE = 1;
if (serverSE.length == 1) {
    serverE = serverSE[0] -1;
} else {
    serverS= serverSE[0] - 0;
    serverE= serverSE[1] - 0;
}

var cityList = [];
for (var i = serverS; i <= serverE; i++) {
    cityList.push(i);
}

var configData = configManager.createConfigFromCountry(mArgv[2]);
var vipConfig = configData.getConfig("vip");
console.log(server, cityList);
//async.forEach
async.forEachSeries(cityList, function(city, cb) {
    var groupSql = "SELECT `userUid`, SUM(`orderMoney`) AS sumMoney FROM `payOrder` GROUP BY `userUid` HAVING sumMoney >0";

    var sql = "SELECT `userUid`, `value` FROM `variable` WHERE  `name` = 'totalCharge' AND `value` > 0";
    mysql.game(null, mArgv[2], city).query(sql, function(err, res) {
        if (err) {
            console.log(city, "错误", err);
        }

        var totalChargeList = res; // variable表 充值数


        mysql.game(null, mArgv[2], city).query(groupSql, function(err, res) {
            if (err) {
                console.log(err);
                cb(null);
                return;
            }

            var orderMoneyList = res;

            var resetList = []; //不匹配的列表

            console.log("city:",city);
            for (var i = 0; i < orderMoneyList.length; i++) {
                var orderMoneyValue = orderMoneyList[i];
                var check = false;

                for (var j = 0; j < totalChargeList.length; j++) {
                    var totalChargeValue = totalChargeList[j];
                    if (orderMoneyValue["userUid"] == totalChargeValue["userUid"]) {
                        check = true;
                        if (orderMoneyValue["sumMoney"] != totalChargeValue["value"]) {
                            console.log(orderMoneyValue["userUid"] , orderMoneyValue["sumMoney"], totalChargeValue["value"]);
                            resetList.push([orderMoneyValue["userUid"] , orderMoneyValue["sumMoney"], totalChargeValue["value"]]);

                        }
                        break;
                    }
                }
//                resetList.push([12901698676,180,11]);

                if (check == false ) {
                    console.log("不匹配", orderMoneyValue);
                }
            }

            async.forEachSeries(resetList, function(item, forCb) {
                var userUid = item[0];
                var sumMoney = item[1];

                userVariable.setVariable(userUid, "totalCharge", sumMoney, function(err, res) {
                    if (err) {
                        console.log("ERROR", userUid, sumMoney);
                    }
                    var newVipLevel = 1;
                    for (var key in vipConfig) {
                        var nextKey = (parseInt(key) + 1) + "";
                        var start = vipConfig[key]["needMoney"];
                        var end;
                        if (vipConfig.hasOwnProperty(nextKey))
                            end = vipConfig[nextKey]["needMoney"];
                        else
                            end = 100000000;//应该没人会冲1个亿吧...
                        if (sumMoney >= start && sumMoney < end) {
                            newVipLevel = parseInt(key);
                            break;
                        }
                    }

                    user.updateUser(userUid, {"vip":newVipLevel}, function(err, res) {
                        forCb(null);
                    });

                });
            }, function(err) {
                cb(null);
            });
        });
    });

}, function(err, res) {

    console.log("======END");

});



