/******************************************************************************
 * 理财计划
 * 购买接口
 * Create by MR.Luo.
 * Create at 14-7-23.
 *****************************************************************************/

var async = require("async");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var financial = require("../model/financialPlan");
var user = require("../model/user");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");

exports.start = function(postData, response, query) {

    if (jutil.postCheck(postData, "buyIdx") == false) {
        response.echo("friend.add", jutil.errorInfo("postError"));
        return false;
    }

    var userUid = query["userUid"];
    var buyIdx = postData["buyIdx"] - 0; // 要购买的计划索引

    var financialConfig = null; // 活动配置
    var buyConfig = null; // 要购买的计划的配置
    var userData = null; // 用户数据

    var gRes = { "updateList" : [] };

    async.series([

        function(cb) { // 获取活动配置
            activityConfig.getConfig(userUid, financial.configName, function(err, res){
                if (err || res == null) cb("dbError");
                else {
                    financialConfig = res;
                    cb(null);
                }
            });
        },

        function(cb) { // 取用户数据
            user.getUser(userUid, function(err, res){
                if (err || res == null) cb("dbError");
                else {
                    userData = res;
                    cb(null);
                }
            });
        },

        function(cb) { // 判断能否购买
            if (!financialConfig[0]) { // 活动已经结束
                cb("notOpen");
                return;
            }

            if (!financialConfig[2]) {
                cb("configError");
                return;
            }

            financial.getBuyInfo(userUid, financialConfig[4], function(err, idx){
                if (err) cb(err);
                else {
                    if (idx >= 0) { // 已经买过了
                        cb("alreadyBuy");
                    } else {
                        cb(null);
                    }
                }
            });
        },

        function(cb) { // 判断能否购买
            var aConfig = financialConfig[2];

            buyConfig = aConfig[buyIdx]; // 取要购买的计划的配置
            if (!buyConfig) {
                cb("configError");
                return;
            }

            var aReward = buyConfig["reward"];
            var daysToGet = Object.keys(aReward).length; // 领奖需要的时间

            var midTime = financialConfig[5] - daysToGet * 60 * 60 * 24;
            if (midTime <= financialConfig[4]) {
                cb("configError");
                return;
            }

            if (jutil.now() > midTime) { // 已经过了购买期
                cb("canNotBuy");
                return;
            }

            var needRecharge = buyConfig["needRecharge"];

            if (userData["ingot"] < needRecharge) { // 伊美加币不足
                cb("noRMB");
                return;
            }

            financial.getChargeNum(userUid, financialConfig[4], function(err, num){
                if (err) cb(err);
                else {
                    if (num >= needRecharge) { // 充值金额足够
                        cb(null);
                    } else { // 充值金额不足
                        cb("needMoreRecharge");
                    }
                }
            });
        },

        function(cb) { // 购买计划
            financial.setBuyInfo(userUid, buyIdx - 0, function(err, res){
                if (err) cb(err);
                else {
                    cb(null);
                }
            });
        },

        function(cb) { // 扣除伊美加币
            var ingotCost = buyConfig["needRecharge"];
            var newIngotData = {"ingot":Math.max(userData["ingot"] * 1 - ingotCost * 1, 0)};
            user.updateUser(userUid, newIngotData, function(err, res) {
                if (err) {
                    console.error(err);
                    cb(null);
                } else {
                    gRes.updateList.push(newIngotData);
                    mongoStats.expendStats("ingot", userUid, '127.0.0.1', null, mongoStats.E_FINANCIAL, ingotCost);
                    //TODO: 根据 buyIdx 分支
                    stats.recordWithLevelIndex(buyIdx, [mongoStats.financialPlan1, mongoStats.financialPlan2, mongoStats.financialPlan3], function (tag) {
                        stats.events(userUid, "127.0.0.1", null, tag);
                    }, "", "");
                    stats.events(userUid,"127.0.0.1",null,mongoStats.financialPlan1);
                    cb(null);
                }
            });
        }

    ], function(err){
        if (err) {
            response.echo("financial.buy", jutil.errorInfo(err));
        } else {
            response.echo("financial.buy", gRes);
        }
    });
};