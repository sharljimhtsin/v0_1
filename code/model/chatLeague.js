/**
 * User: liyuluan
 * Date: 14-3-7
 * Time: 下午4:38
 */

var redis = require("../alien/db/redis");
//var jutil = require("../utils/jutil");

//发送一条联盟聊天数据
function sendMsg(userUid, leagueUid, userName, msg, callbackFn ) {
    var mstr = userUid + "|" + userName + "|" + msg;
    redis.domain(userUid).l("chatLeague" + leagueUid).leftPush(mstr, function(err, res) {
        redis.domain(userUid).l("chatLeague" + leagueUid).trim(0, 50);
        callbackFn(null, mstr);
    });
}

function GMSendMsg(country, city, leagueUid, userName, msg, callbackFn ) {
    var mstr = "0|"+userName+"|" + msg;
    redis.domain(country, city).l("chatLeague" + leagueUid).leftPush(mstr, function(err, res) {
        redis.domain(country, city).l("chatLeague" + leagueUid).trim(0, 50);
        callbackFn(null, mstr);
    });
}

function getMsgList(userUid, leagueUid, callbackFn) {
    redis.domain(userUid).l("chatLeague" + leagueUid).range(0, 50, function(err, res) {
        callbackFn(null, res);
    });
}

function getAllMsgList(country, city, leagueUid, callbackFn) {
    redis.domain(country, city).l("chatLeague" + leagueUid).range(0, 50, function(err, res) {
        callbackFn(null, res);
    });
}

exports.sendMsg = sendMsg;
exports.GMSendMsg = GMSendMsg;
exports.getMsgList = getMsgList;
exports.getAllMsgList = getAllMsgList;
