/**
 * practice.ctLoginReward
 * User: liyuluan
 * Date: 14-1-8
 * Time: 下午3:18
 */
var jutil = require("../utils/jutil");
var practice = require("../model/practice");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var modelUtil = require("../model/modelUtil");
var userVariable = require("../model/userVariable");
var async = require("async");
var mongoStats = require("../model/mongoStats");


/**
 * 连续登录奖励领取 practice.ctLoginReward
 * 参数
 *      dayIndex  要今天的天数 ，从0开始
 *
 * 返回
 *      packContent  领取的包内容
 *      resultData 当前实际数据
 *
 * @param postData
 * @param response
 * @param query
 */
function start(postData, response, query) {
    if (jutil.postCheck(postData, "dayIndex") == false) {
        response.echo("practice.ctLoginReward", jutil.errorInfo("postError"));
        return;
    }

    var dayIndex = postData["dayIndex"] - 0;
    var userUid = query["userUid"];
    var configData = configManager.createConfig(userUid);

    if (isNaN(dayIndex) == true || dayIndex < 0 || dayIndex >= 7) {
        response.echo("practice.ctLoginReward", jutil.errorInfo("postError"));
        return;
    }

    var resultData = []; //结果数据
    var packContent = null;//领取的包内容

    async.series([
        function(cb) { //获取是否已领取
            practice.getCtLoginData(userUid, dayIndex, function(err, res) {
                if (err) cb("dbError");
                else {
                    var mValue = res - 0;
                    if (mValue != 0) cb("haveReceive");
                    else cb(null);
                }
            });
        },
        function(cb) { //获取连续登录天数, 是否可领取
            userVariable.getVariableTime(userUid, "loginLog", function(err, res) {
                if (err) cb("dbError");
                else {
                    var mLog = res || {"value":0,"time":0};
                    var mLogValue = mLog["value"] - 0;
                    if (mLogValue <= dayIndex) {
                        cb("notTimed");
                    } else {
                        cb(null);
                    }
                }
            });
        },
        function(cb) { //给物品
            var dayIndexStr = (dayIndex + 1);
            var mConfig = configData.g("growth")("sevenDays")("content")(dayIndexStr)();
            if (mConfig == null) cb("configError");
            else {
                var mArray = [];
                for (var key in mConfig) {
                    var mKey = key;
                    if (key == "zeni") mKey = "gold";
                    if (key == "imegga") mKey = "ingot";
                    mArray.push({"id":mKey, "count":mConfig[key]});
                }
                var userIP = '127.0.0.1';//response.response.socket.remoteAddress;
                async.forEach(mArray, function(objItem, forCb) {
                    mongoStats.dropStats(objItem["id"], userUid, userIP, null, mongoStats.LOGIN7, objItem["count"]);
                    modelUtil.addDropItemToDB(objItem["id"], objItem["count"], userUid, 0, 1, 1, function(err, res) {
                        resultData.push(res);
                        if (err) console.error(objItem["id"], objItem["count"], userUid, err.stack);
                        forCb(null);
                    });
                }, function(err) {
                    packContent = mArray;
                    cb(null);
                });
            }
        },
        function(cb) { //更新标识位
            practice.setCtLoginData(userUid, dayIndex, function(err, res) {
                if (err) cb("dbError");
                else {
                   cb(null);
                }
            });
        }
    ], function(err) {
        if (err) response.echo("practice.ctLoginReward", jutil.errorInfo(err));
        else {
            response.echo("practice.ctLoginReward", {"packContent":packContent, "resultData":resultData});
        }
    });
}

exports.start = start;