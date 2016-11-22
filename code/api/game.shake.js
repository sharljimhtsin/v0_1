/**
 * game.shake 摇龙珠
 * User: liyuluan
 * Date: 14-1-14
 * Time: 下午3:22
 */

var userVariable = require("../model/userVariable");
var jutil = require("../utils/jutil");
var gameswitch = require("../model/gameswitch");
var async = require("async");
var configManager = require("../config/configManager");
var user = require("../model/user");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");
var vitality = require("../model/vitality");

/**
 * 参数:
 *      shake 1 表示摇龙珠 0 表示只获取是不是可以摇
 * 返回：
 *      "resultData":掉落结果 (shake=0时不返回)
 *      "packContent": 掉落的物品 (shake=0时不返回)
 *      "count":当前剩余可摇的次数 （实时可摇次数需要加上当前时间减time的时间 ）
 *      "time":上次摇的时间
 * @param postData
 * @param response
 * @param query
 */
function start(postData, response, query) {
    var userUid = query["userUid"];

    var isShake = (postData == null) ? 0 : (postData["shake"] || 0);

    var newCount = 0;
    var newTime = 0;

    var rActivityValue = 0;
    var configData = configManager.createConfig(userUid);

    var dropArray = null;
    var resultData = null;

    async.series([
        function(cb) { //取可摇次数
            userVariable.getVariableTime(userUid, "gameShake", function(err, res) {
                if (err) cb("dbError");//response.echo("game.shake", jutil.errorInfo("dbError"));
                else {
                    var mValue = 0; // 剩余几次
                    var mTime = 0;// 上次时间
                    if (res != null) {
                        mValue = res["value"] - 0;
                        mTime = res["time"] - 0;
                    }
                    var nowHour = Math.floor(jutil.now() / 60 / 60);
                    var preHour = Math.floor(mTime / 60 / 60);
                    var mCount = nowHour - preHour + mValue;
                    if (mCount > 3) mCount = 3;
                    if (mCount <= 0 && isShake == 1) {
                        cb("cannotShake");
                    } else {
                        if (isShake == 1) {
                            newCount = mCount - 1; //将新值减一
                            newTime = nowHour * 60 * 60;
                            cb(null);
                        } else {
                            newCount = mCount;
                            newTime = mTime;
                            cb("EXIT");
                        }
                    }
                }
            });
        },
        function(cb) { //判断是否有摇龙珠活动在进行
            gameswitch.getSwitchOpen(userUid,gameswitch.SHAKE_ACTIVITY, function(err, res) {
                if (err) cb(err);
                else {
                    rActivityValue = res;
                    cb(null);
                }
            });
        },
        function(cb) { //取配置
            var shakeConfig = null;
            if (rActivityValue == 0) {
                shakeConfig = configData.g("shake")("normal")();
            } else {
                shakeConfig = configData.g("shake")("activity")(rActivityValue)();
            }

            if (shakeConfig == null) {
                cb("configError");
            } else {
                var randomVal = Math.random();
                for (var key in shakeConfig) {
                    var mItem = shakeConfig[key];
                    if (randomVal >= mItem["minProb"] && randomVal < mItem["maxProb"]) {
                        if (mItem["content"] != null) {
                            dropArray = mItem["content"];
                            cb(null);
                        } else if (mItem["levelContent"] != null) {
                            var mLevelContent = mItem["levelContent"];
                            user.getUser(userUid, function(err, res) {
                                if (err || res == null) cb("dbError");
                                else {
                                    //var mLevel = configData.userExpToLevel(res["exp"]);
                                    dropArray = mLevelContent[res["lv"]];
                                    cb(null);
                                }
                            });
                        }
                        break;
                    }
                }
            }
        },
        function(cb) { //content处理
            if (dropArray == null || dropArray.length == 0) {
                cb("configError");
            } else {
                resultData = [];
                async.forEach(dropArray, function(dropItem, forCb) {
                    var userIP = '127.0.0.1';//response.response.socket.remoteAddress;
                    mongoStats.dropStats(dropItem["id"], userUid, userIP, null, mongoStats.SHAKE, dropItem["count"]);
                    modelUtil.addDropItemToDB(dropItem["id"], dropItem["count"], userUid, 0, 1, function(err, res) {
                        if (res != null) resultData.push(res);
                        forCb(null);
                    });
                }, function(err) {
                    cb(null);
                });
            }
        },
        function(cb) {
            userVariable.setVariableTime(userUid, "gameShake",newCount, newTime,function(err, res) {
                if (err) console.error(userUid, newCount, newTime, err.stack);
                cb(null);
            });
        }
    ], function(err) {
        if (err) {
            if (err == "EXIT") {
                response.echo("game.shake", {"count":newCount, "time":newTime});
            } else {
                response.echo("game.shake", jutil.errorInfo(err));
            }
        } else {
            vitality.vitality(userUid, "shake", {"completeCnt":1}, function(){});

            response.echo("game.shake", {"resultData":resultData, "packContent":dropArray, "count":newCount, "time":newTime});
        }
    });
}


exports.start = start;