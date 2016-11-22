/**
 * 购买月卡玩家
 * User: liyuluan
 * Date: 14-5-14
 * Time: 下午2:09
 * To change this template use File | Settings | File Templates.
 */

var mysql = require("../code/alien/db/mysql");
var async = require("async");

var mArgv = process.argv;

if (mArgv.length < 4){
    return;
}


var server = mArgv[3] - 0;
var cityList = [];
for (var i = 1; i <= server; i++) {
    cityList.push(i);
}

console.log(server, cityList);
async.forEach(cityList, function(city, cb) {
    var mDate = Math.floor(Date.now()/1000);

    mysql.game(null, mArgv[2], city).query('SELECT userUid FROM `user` WHERE (`monthCard`="fifty" OR `monthCard`="thirty") AND monthCardTime>'+mDate, function(err, res) {
        if (err) {
            console.log(err);
            return;
        }
        var arr = [];
        for (var i = 0; i < res.length; i++) {
            arr.push(res[i]["userUid"]);
        }
        console.log(city + "区:" + arr.join(","));
        cb(null);
    });
}, function(err, res) {
});




