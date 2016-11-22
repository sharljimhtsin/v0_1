/**
 *
 * Date: 14-5-26
 * Time: 下午3:22
 */
var mysql = require("../code/alien/db/mysql");
var redis = require("../code/alien/db/redis");
var configManager = require("../code/config/configManager");
var async = require("async");
var fs = require("fs");
var jutil = require("../code/utils/jutil");
var bitUtil = require("../code/alien/db/bitUtil");
var rs = new Response();
function Response() {
    // nothing
}
Response.prototype.echo = function (str1, str2) {
    console.log(str1, str2);
};

/*
 var userUid = "17314192408";

 var rechargeRanking = require("../code/model/rechargeRanking");
 rechargeRanking.addRecordCli(userUid, 60300 - 72000, function (err, res) {
 console.log(err, res);
 });*/

/*var tabletsTopList = require("../code/api/pvp.tabletsTopList");
 var tabletsGetReward = require("../code/api/pvp.tabletsGetReward");
 var gsTabletsUser = require("../code/model/gsTabletsUser");
 gsTabletsUser.tabletsTaskDailyReward("i", function (err, res) {
 console.log(err, res);
 tabletsGetReward.start({"type": 1}, rs, {"userUid": "38856038406"});
 });*/

var model = require("../code/model/mixContestData");
model.startBattle(77393303588);

//var model = require("../code/model/gsTabletsUser");
//model.sendClickReward(17196832533, function (err, res) {
// console.log(err, res);
//});

// var model = require("../code/model/globalContestData");
// model.doBattle(17314195921, 17314195921, 1, 1, "NOKEY", {}, function (err, res) {
// console.log(err, res);
// });


//
// var upStar = require("../code/model/upStar");
// var data = {
//     "1401519098298625": {
//         "damageAdd": 0.07,
//         "damageReduce": 0,
//         "price": [{"id": "gold", "count": 35295131}, {"id": 104052, "count": 55}],
//         "major": 3,
//         "minor": "7",
//         "damageAddBase": 0,
//         "damageReduceBase": 0,
//         "nextPrice": [{"id": "gold", "count": 35295131}, {"id": 104052, "count": 55}]
//     }
// };
// upStar.getCostItem(38671483461, data, "1401519098298625", "140001", function (err, res) {
//     console.log(err, res);
// });