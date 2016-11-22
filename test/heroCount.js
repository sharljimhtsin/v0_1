var payLog = require("../code/model/stats").pay;
var mysql = require("../code/alien/db/mysql");
var async = require("async");


var mArgv = process.argv;

if (mArgv.length < 4){
    console.log("参数不对");

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

var heroId = mArgv[4];

var sql = "SELECT count(*) AS count FROM  `hero` WHERE  `heroId` =" + heroId;

async.forEachSeries(cityList, function(city, forCb) {
    mysql.game(null, country, city).query(sql, function(err, res) {
        if (err) console.log(err);
        else {
            if (res != null && res.length > 0) console.log(city, res[0]['count']);
            forCb(null);
        }
    });
}, function() {
    console.log("END");
});