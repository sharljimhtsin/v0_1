/**
 * 统计某个物品被购买的记录。 参数 country city itemId time
 */

var mysql = require("../code/alien/db/mysql");
var redis = require("../code/alien/db/redis");
var async = require("async");

var mArgv = process.argv;

if (mArgv.length < 6){

    return;
}

var country = mArgv[2]; //大区


var server = mArgv[3];
var serverSE = server.split("_");
var serverS = 1;
var serverE = 1;
if (serverSE.length == 1) {
    serverE = serverSE[0] - 0;
} else {
    serverS= serverSE[0] - 0;
    serverE= serverSE[1] - 0;
}


var cityList = [];
for (var i = serverS; i <= serverE; i++) {
    cityList.push(i);
}

console.log(server, cityList);

var itemId = mArgv[4]; //查询itemId
var timeSE = mArgv[5].split("_"); //时间范围
var timeS = timeSE[0];
var timeE = timeSE[1];
if (timeE == null) {
    timeE = new Date(2029,0,1) / 1000;
}


var sql = "SELECT * FROM `shop` WHERE `itemId`=" + itemId +" AND `sTime`>=" + timeS + " AND `eTime`<=" + timeE;
mysql.loginDB(country).query(sql, function(err, res) {
//    console.log(err, res);
    if (err || res == null) {
        console.log("ERROR", "没有出售记录", err);
        return;
    }

    var shopUids = [];
    for (var i = 0; i < res.length; i++) {
        shopUids.push(res[i]["shopUid"]);
    }
    console.log("分区", "人数", "购买次数");
    // 循环
    async.forEachSeries(cityList, function(city, forCb) {

        var shopUidsStr = shopUids.join(",");
        var buyLogSql = "SELECT  `userUid` , SUM(  `count` ) AS count FROM  `buyLog` WHERE  `shopUid` IN(" + shopUidsStr +") GROUP BY  `userUid`";

        mysql.game(null, country, city).query(buyLogSql, shopUids, function(err, res) {
            if (err) console.log(err);
            else {
                console.log(city, res.length, sumArray(res, "count"));
                forCb(null);
            }
        });


    }, function(err, res) {
        console.log("END");
    });
});


function sumArray(arr, field) {
    var sumValue = 0;
    for (var i = 0; i < arr.length; i++) {
        sumValue += (arr[i][field] - 0);
    }
    return sumValue;
}
