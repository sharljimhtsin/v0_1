/**
 * User: liyuluan
 * Date: 14-3-7
 * Time: 下午4:38
 */

var redis = require("../alien/db/redis");
//var jutil = require("../utils/jutil");

//发送一条聊天数据
function sendMsg(userUid, userName, msg, callbackFn ) {
    var mstr = userUid + "|" + userName + "|" + msg;
    redis.domain(userUid).l("chat").leftPush(mstr, function(err, res) {
        redis.domain(userUid).l("chat").trim(0, 50);
        callbackFn(null, mstr);
    });
}

function GMSendMsg(country, city, userName, msg, callbackFn ) {
    var mstr = "0|"+userName+"|" + msg;
    redis.domain(country, city).l("chat").leftPush(mstr, function(err, res) {
        redis.domain(country, city).l("chat").trim(0, 50);
        callbackFn(null, mstr);
    });
}

function getMsgList(userUid, callbackFn) {
    redis.domain(userUid).l("chat").range(0, 50, function(err, res) {
        callbackFn(null, res);
    });
}

function getAllMsgList(country, city, callbackFn) {
    redis.domain(country, city).l("chat").range(0, 50, function(err, res) {
        callbackFn(null, res);
    });
}

function gag(userUid, callbackFn) {
    redis.domain(userUid).h("chatGag").set(userUid, 0, function(err, res) {
        callbackFn(null, res);
    });
}

function ungag(userUid, callbackFn) {
    redis.domain(userUid).h("chatGag").hdel(userUid, function(err, res) {
        callbackFn(null, res);
    });
}

function getGagList(country, city, callbackFn) {
    redis.domain(country, city).h("chatGag").getObj(function(err, res) {
        callbackFn(null, res);
    });
}

function getGag(userUid, callbackFn) {
    redis.domain(userUid).h("chatGag").get(userUid, function(err, res) {
        callbackFn(null, res);
    });
}

exports.sendMsg = sendMsg;
exports.GMSendMsg = GMSendMsg;
exports.getMsgList = getMsgList;
exports.getAllMsgList = getAllMsgList;

exports.gag = gag;
exports.ungag = ungag;
exports.getGag = getGag;
exports.getGagList = getGagList;
