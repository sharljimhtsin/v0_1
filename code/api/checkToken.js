/**
 * TOKEN校验类。对需要身份验证的方法进行校验
 * User: liyuluan
 * Date: 13-10-10
 * Time: 下午2:37
 */

var userToken = require("../model/userToken");
var userOnline = require("../alien/stats/userOnline");
var stats = require("../model/stats");
var bitUtil = require("../alien/db/bitUtil");
var jutil = require("../utils/jutil");
var redis = require("../alien/db/redis");
var login = require("../model/login");
require("../model/pushCron");
var TOKEN_INVALID = '{"ERROR":"tokenInvalid","info":"会活无效或过期"}';
var gameConfigPath = "../../config/";
var fs = require('fs');

function check(queryMethod, postData, query, request, callbackFn) {
    if (queryMethod == "user.getToken" || queryMethod == "server.list" || queryMethod == "user.iosReg" || queryMethod == "user.changePassword" || queryMethod == "ios.isShowIAD" || queryMethod == "ky.verifyToken" || queryMethod == 'androidLogin.verify' || queryMethod == "kingnet.login" || queryMethod == "user.getUserUid") {
        callbackFn(null,true);
    } else {
        var userUid = query["userUid"];
        var token = query["token"];
        if (userUid == null) {
            fs.appendFile('token.log', jutil.now() + " | userUid null" + "\n", 'utf8');
            callbackFn("ERROR",TOKEN_INVALID);
        } else {
            var mCodeArray = bitUtil.parseUserUid(userUid);
            try { //如果用户分区不正确则通出
                require(gameConfigPath + mCodeArray[0] + "_server.json");
            } catch (err) {
                fs.appendFile('token.log', jutil.now() + " | " + err + " | " + userUid + "\n", 'utf8');
                callbackFn("ERROR",TOKEN_INVALID);
                return;
            }


            userOnline.heartbeat(userUid);
            _currentOnline(userUid);
            userToken.checkToken(userUid, token, function (err, res) {
                if (err) {
                    fs.appendFile('token.log', jutil.now() + " | " + err + " | " + userUid + " | " + token + "\n", 'utf8');
                    // check twice for redis problem
                    userToken.checkToken(userUid, token, function (err, res) {
                        if (err) {
                            fs.appendFile('token.log', jutil.now() + " | " + err + " | " + userUid + " | " + token + "\n", 'utf8');
                            callbackFn("ERROR", TOKEN_INVALID);
                        } else {
                            callbackFn(null, true);
                        }
                    });
                } else {
                    callbackFn(null, true);
                }
            });
        }
    }
}

var preTimeDic = {};

function _currentOnline(userUid) {
    var mKey = bitUtil.leftShift(userUid, 24);
    var mNow = jutil.nowMillisecond();

    if (preTimeDic[mKey] == null || mNow - preTimeDic[mKey] > 300000) {
        preTimeDic[mKey] = mNow;
        userOnline.currentOnline(userUid, function (err, res) {
            if (err) {
                console.error(err.stack, "stats user online");
            } else if (res != -1) {
                stats.onlineCount(userUid, "127.0.0.1", null, res);
            }
        });
    }
}

exports.check = check;