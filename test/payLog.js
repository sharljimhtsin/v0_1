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


var sql = "SELECT * FROM  `payOrder` WHERE  `platformId` LIKE  'p91' AND  `createTime` >=1406217600";

async.forEachSeries(cityList, function(city, forCb) {
    mysql.game(null, "c", city).query(sql, function(err, res) {
        if (err) console.log(err);
        else {
            for (var i = 0; i< res.length; i++) {
                var userData = res[i];
//                console.log(city, userData);
                payLog(userData["userUid"], "127.0.0.1", null, userData["orderMoney"] - 0, userData["goodsCount"], userData["orderNo"]);
            }
            forCb(null);
        }
    });
}, function() {
    console.log("END");
});


