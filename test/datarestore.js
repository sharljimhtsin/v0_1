/**
 * Created with JetBrains WebStorm.
 * User: liyuluan
 * Date: 14-5-16
 * Time: 下午5:00
 * To change this template use File | Settings | File Templates.
 */



//SELECT *
//FROM  `hero`
//WHERE  `userUid` =12968803964
//AND `train`>0

var p91 = [
    {"userUid":12901679150, "city":1},
    {"userUid":12952030289, "city":4},
    {"userUid":12968803964, "city":5},
    {"userUid":13019126979, "city":8}
];

var ios = [
    {"userUid":17196647303, "city":1},
    {"userUid":17196648514, "city":1},
    {"userUid":17196779865, "city":1},
    {"userUid":17213424393, "city":2},
    {"userUid":17213439196, "city":2},
    {"userUid":17213492900, "city":2},
    {"userUid":17213508597, "city":2},
    {"userUid":17213509904, "city":2},
    {"userUid":17213522000, "city":2},
    {"userUid":17230210106, "city":3},
    {"userUid":17230257459, "city":3},
    {"userUid":17230263974, "city":3},
    {"userUid":17230272590, "city":3},
    {"userUid":17230300045, "city":3},
    {"userUid":17263856367, "city":5}
]


var p91Mysql = {
    "host":"172.24.8.10",
    "user":"nconf",
    "password":"nconf",
    "port":3306,
    "database":"dragongame_"
}


var iosMysql = {
    "host":"172.24.8.10",
    "user":"nconf",
    "password":"nconf",
    "port":3306,
    "database":"dragongame_iso_"
}


var mysql = require("mysql");
var async = require("async");


//var pool = mysql.createPool(p91Mysql);

//"SELECT * FROM `hero` WHERE `userUid`=12901679150 AND `train`>0"
//
//"SELECT * FROM  `item` WHERE  `userUid` =12901679150 AND  `itemId` = '150901'";
//
//
//"SELECT * FROM  `variable` WHERE  `userUid` =12901679150 AND `name`='redeemPoint'"


var userDataList = [];
async.forEach(p91, function(item, cb) {
    var userUid = item["userUid"];
    var city = item["city"];
    var mConfig = p91Mysql;

    var mysqlConfig = {};
    mysqlConfig.host = mConfig.host;
    mysqlConfig.user = mConfig.user;
    mysqlConfig.password = mConfig.password;
    mysqlConfig.port = mConfig.port;
    mysqlConfig.database = mConfig.database + city;
    var pool = mysql.createPool(mysqlConfig);

    var userData = {};
    userData["userUid"] = userUid;
    userData["city"] = city;


    async.series([

        function(cb) {
            pool.query("SELECT * FROM `user` WHERE `userUid`=" + userUid, function(err, res) {
                userData["user"] = res;
                cb(null)
            });
        }
//        function(cb) {
//            pool.query("SELECT * FROM `hero` WHERE `userUid`=" + userUid +" AND `train`>0", function(err, res) {
//                userData["hero"] = res;
//                cb(null)
//            });
//        },
//        function(cb) {
//            pool.query("SELECT * FROM  `item` WHERE  `userUid` =" + userUid + " AND  `itemId` = '150901'", function(err, res) {
//                userData["item"] = res;
//                cb(null)
//            });
//        },
//        function(cb) {
//            pool.query("SELECT * FROM  `variable` WHERE  `userUid` =" + userUid +" AND `name`='redeemPoint'", function(err, res) {
//                userData["redeemPoint"] = res;
//                cb(null)
//            });
//        }
    ], function(err, res) {
        userDataList.push(userData);
        cb();
    });
}, function(err, res) {
    var str = JSON.stringify(userDataList);
    console.log(str);
});






