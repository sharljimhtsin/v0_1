/**
 * Created by xiayanxin on 2016/9/19.
 *
 * 跨服激戰添加挑戰次數
 */

var configManager = require("../config/configManager");
var user = require("../model/user");
var jutil = require("../utils/jutil");
var async = require("async");
var pvptop = require("../model/pvpTopCross");
var mongoStats = require("../model/mongoStats");
var TAG = "pvp.cross.addChangeTimes";

function start(postData, response, query) {
    var userUid = query["userUid"];
    var count = postData["count"] ? postData["count"] : 1;
    var cost = count * 200;
    var configData = configManager.createConfig(userUid);
    var mainConfig = configData.getConfig("main");
    var pvpData = {};
    var userData = {};
    var updateVariable = {};
    var returnData = {};
    async.auto({
        "getUser": function (cb) {
            user.getUser(userUid, function (err, res) {
                if (err || res == null) {
                    cb("noThisUser");
                } else {
                    userData = res;
                    cb();
                }
            });
        },
        "getPvpTimes": ["getUser", function (cb) {
            pvptop.getChallengeTimes(userUid, function (err, res) {
                pvpData = res;
                cb(err);
            });
        }],
        "setPvpTimes": ["getUser", "getPvpTimes", function (cb) {
            if (userData["level"] < mainConfig["rankBattleOpen"]) {//等级不够
                cb("fiveLevelOpen");
            } else if (userData["ingot"] - cost < 0) {
                cb("ingotNotEnough");
            } else {
                async.series([function (endCb) {
                    returnData["userData"] = {"ingot": userData["ingot"] - cost};
                    mongoStats.expendStats("ingot", userUid, "127.0.0.1", userData, mongoStats.PVPTOPCROSS1, cost);
                    user.updateUser(userUid, returnData["userData"], endCb);
                }, function (endCb) {
                    updateVariable["value"] = parseInt(pvpData["value"]) + parseInt(count);
                    updateVariable["time"] = jutil.now();
                    returnData["challenge"] = updateVariable;
                    pvptop.setChallengeTimes(userUid, updateVariable, endCb);
                }], cb);
            }
        }]
    }, function (err) {
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            response.echo(TAG, returnData);
        }
    });
}
exports.start = start;