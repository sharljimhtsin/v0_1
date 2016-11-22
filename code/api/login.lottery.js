/**
 * 登录翻牌抽奖
 * User: liyuluan
 * Date: 14-1-7
 * Time: 下午12:05
 */

var jutil = require("../utils/jutil");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var userVariable = require("../model/userVariable");
var modelUtil = require("../model/modelUtil");
var user = require("../model/user");
var async = require("async");
var mongoStats = require("../model/mongoStats");
var activityConfig = require("../model/activityConfig");
var signInMod = require("../model/signIn");
var achievement = require("../model/achievement");
var redis = require("../alien/db/redis");

/**
 * login.lottery
 * 参数：
 *      无
 *
 * 返回：
 *      allItem ： 所有的翻牌项 数组（1 - 16） 0 为无效数据
 *      selected ：玩家选中的项  数组
 *      resultList ：玩家的当前数据
 *
 * @param postData
 * @param response
 * @param query
 */
function start(postData, response, query) {
    var userUid = query["userUid"];
    var configData = configManager.createConfig(userUid);

    var loginLogCount = 1;//连续登录次数
    var userLevel = 1;//用户等级
    var resultList = null; //奖励给得结果
    var lotteryData = {};//获得奖励结果
    var gUserData = null;
    var mLog;
    activityConfig.getConfig(userUid, "signIn", function(err, res) {
        if (!err && res != null) {
            signInMod.hasRewardToGet(userUid, function(cnt){
                redis.domain(userUid).s("noticeTime").get(function(err, res){
                    var noticeTime = 0;
                    if(!err && res != null)
                        noticeTime = res;
                    response.echo("login.lottery", {"showSignIn":true,"cnt":cnt, "noticeTime":noticeTime});
                    newLogic();
                });
            });
        } else {
            oldLogic();
        }
    });

    function newLogic() {
        async.series([
            function(cb) { //取登录记录
                userVariable.getVariableTime(userUid, "loginLog", function(err, res) {
                    if (err) cb("dbError");
                    else {
                        mLog= res || {"value":0,"time":0};
                        if (jutil.compTimeDay(mLog["time"], jutil.now() - 86400) == true) {
                            loginLogCount = (mLog["value"] - 0) + 1;
                            cb(null);
                        } else if (jutil.compTimeDay(mLog["time"], jutil.now()) == true) {
                            cb("haveReceive");
                        } else {
                            loginLogCount = 1;
                            cb(null);
                        }
                    }
                });
            },
            function(cb) { //写登录时间
                achievement.totalLogin(userUid, function(){}); // 累积登录成就统计
                userVariable.setVariableTime(userUid, "loginLog", loginLogCount, jutil.now(), function(err, res) {//loginLogCount
                    if (err) console.error(userUid, loginLogCount, jutil.now(), err.stack);//loginLogCount
                    cb(null);
                });
            }
        ],function(err) {

        });
    }


    function oldLogic() {
        async.series([
            function(cb) { //取登录记录
                userVariable.getVariableTime(userUid, "loginLog", function(err, res) {
                    if (err) cb("dbError");
                    else {
                        mLog= res || {"value":0,"time":0};
                        if (jutil.compTimeDay(mLog["time"], jutil.now() - 86400) == true) {
                            loginLogCount = (mLog["value"] - 0) + 1;
                            cb(null);
                        } else if (jutil.compTimeDay(mLog["time"], jutil.now()) == true) {
                            cb("haveReceive");
                        } else {
                            loginLogCount = 1;
                            cb(null);
                        }
                    }
                });
            },
            function(cb) { //取userId
                user.getUser(userUid, function(err, res) {
                    if (err || res == null) cb("dbError");
                    else {
                        gUserData = res;
                        userLevel = res["lv"];
                        cb(null);
                    }
                });
            },
            function(cb) { //取奖励
                var mLoginLogCount = loginLogCount;
                if (mLoginLogCount > 5) mLoginLogCount = 5;
                lotteryData = randomGift(mLoginLogCount, userLevel, configData.getConfig("login"));
                var selectedList = lotteryData["selected"];
                var allItem = lotteryData["allItem"];
                resultList = [];

                var userIP = '127.0.0.1';//response.response.socket.remoteAddress;
                async.forEach(selectedList, function(selectedIndex,forCb) {
                    var mId = allItem[selectedIndex]["id"];
                    var mValue = allItem[selectedIndex]["value"];
                    mongoStats.dropStats(mId, userUid, userIP, gUserData, mongoStats.LOGIN_LOTTERY, mValue);
                    modelUtil.addDropItemToDB(mId, mValue, userUid, 0, 1, function(err, res) {
                        resultList.push(res);
                        if (err) console.error(err);
                        forCb(null);
                    });
                }, function(err) {
                    cb(null);
                });
            },
            function(cb) { //写登录时间
                userVariable.setVariableTime(userUid, "loginLog", loginLogCount, jutil.now(), function(err, res) {//userUid,name,value,time,callbackFn//loginLogCount
                    if (err) console.error(userUid, loginLogCount, jutil.now(), err.stack);//loginLogCount
                    cb(null);

                });
            }
        ],function(err) {
            if (err) {
                if (err == "haveReceive") {
                    response.echo("login.lottery", {"haveReceive":1});
                } else {
                    response.echo("login.lottery", {"haveReceive":1});
                }
            } else {
                lotteryData["resultList"] = resultList;
                response.echo("login.lottery", lotteryData);
            }
        });
    }

}

//随机出奖励列表
function randomGift(loginLogCount, userLevel, config) {
    if (config == null) return null;
    var prop = config["prop"];
    if (prop == null) return null
    var randromRange = 1;
    var resultProp = [];
    var allData = [];
    if (userLevel == null || userLevel <= 0) userLevel = 1;

    for (var i = 0; i < loginLogCount; i++) { //随出分组
        var randromValue = randromRange * Math.random();
        for (var j = 1; j <= 16; j++) {
            var item = prop[j];
            var minProb = item["minProb"] || 0;
            var maxProb = item["maxProb"] || 0;
            if (resultProp.indexOf(j) != -1) {
                randromValue += (maxProb - minProb);
            }
            if (randromValue >= minProb && randromValue < maxProb) {
                resultProp.push(j);
                randromRange = randromRange - (maxProb - minProb);
                break;
            }
        }
    }

    for (var i = 1; i <= 16; i++) {
        var mIndex = i;
        var itemConfig = config["content"][mIndex];
        switch(mIndex) {
            case 1:
                allData[mIndex] = {"id":"gold","value":itemConfig["zeni"][userLevel] || 0};
                break;
            case 2:
                allData[mIndex] = {"id":"ingot","value":randomItem(itemConfig["imegga"])};
                break;
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
            case 8:
            case 9:
            case 10:
            case 12:
            case 13:
            case 14:
            case 15:
            case 16:
                var mId = randomItem(itemConfig);
                var mObj = {"id":mId,"value":1};
                allData[mIndex] = mObj;
                break;
            case 11:
                allData[mIndex] = {"id":"150901","value":(randomItem(itemConfig["150901"]) || 0) - 0};
                break;

        }
    }
    return {"allItem":allData,"selected":resultProp};
}


function randomItem(config) {
    if (config == null) return null;
    var randomValue = Math.random();

    for (var key in config) {
        var itemConfig = config[key];
        var minProb = itemConfig["minProb"];
        var maxProb = itemConfig["maxProb"];
        if (randomValue >= minProb && minProb < maxProb) {
            return key;
        }
    }
    return null;
}



exports.start = start;
