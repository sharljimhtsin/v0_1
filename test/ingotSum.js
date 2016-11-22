/**
 * User: liyuluan
 * Date: 14-5-19
 * Time: 下午9:52
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

    mysql.game(null, mArgv[2], city).query('SELECT sum(`ingot`) AS singot FROM `user` WHERE `exp`>4040', function(err, res) {
        if (err || res == null) {
            console.log(err);
            return;
        }
        console.log(city + "区_10级：" + res[0]["singot"]);
        cb(null);
    });
}, function(err, res) {
});


async.forEach(cityList, function(city, cb) {
    var mDate = Math.floor(Date.now()/1000);

    mysql.game(null, mArgv[2], city).query('SELECT sum(`ingot`) AS singot FROM `user` WHERE `exp`>20010', function(err, res) {
        if (err || res == null) {
            console.log(err);
            return;
        }
        console.log(city + "区_20级：" + res[0]["singot"]);
        cb(null);
    });
}, function(err, res) {
});





