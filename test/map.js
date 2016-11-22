/**
 * 通关列表
 * User: liyuluan
 * Date: 14-5-19
 * Time: 下午3:29
 */



var mysql = require("../code/alien/db/mysql");
var async = require("async");

var mArgv = process.argv;

if (mArgv.length < 5){
    console.log("参数不对");
    return;
}


var server = mArgv[3] - 0;
var cityList = [];
for (var i = 1; i <= server; i++) {
    cityList.push(i);
}

var mapId = mArgv[4];

console.log(server, cityList);
async.forEach(cityList, function(city, cb) {

    mysql.game(null, mArgv[2], city).query('SELECT `userUid` FROM  `map` WHERE  `mapId` =' + mapId +' AND  `star` >0', function(err, res) {
        if (err) {
            console.log(err);
            return;
        }
        var arr = [];
        for (var i = 0; i < res.length; i++) {
            arr.push(res[i]["userUid"]);
        }
        console.log(city + "区|" + mapId +":" + arr.join(","));
        cb(null);
    });
}, function(err, res) {
});



