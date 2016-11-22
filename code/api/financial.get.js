/******************************************************************************
 * 理财计划
 * 数据获取接口
 * Create by MR.Luo.
 * Create at 14-7-24.
 *****************************************************************************/

var async = require("async");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var financial = require("../model/financialPlan");
var user = require("../model/user");
var mongoStats = require("../model/mongoStats");

exports.start = function(postData, response, query) {

    var userUid = query["userUid"];
    var buyIdx = null;

    var financialConfig = null; // 活动配置

    var gRes = {};

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

        function(cb) { // 获取购买的计划数据
            if (!financialConfig[0]) {
                cb("notOpen");
                return;
            }

            if (!financialConfig[2]) {
                cb("configError");
                return;
            }

            gRes["config"] = financialConfig[2]; // 配置数据
            gRes["eTime"] = financialConfig[5]; // 活动结束时间

            financial.getBuyInfo(userUid, financialConfig[4], function(err, byIdx){
                if (err) cb(err);
                else {
                    gRes["byIdx"] = byIdx;
                    buyIdx = byIdx;
                    cb(null);
                }
            });
        },

        function(cb) { // 获取活动期间充值金额
            financial.getChargeNum(userUid, financialConfig[4], function(err, chargeNum){
                if (err) cb(err);
                else {
                    gRes["chargeNum"] = chargeNum;
                    cb(null);
                }
            });
        },

        function(cb) { // 获取其他数据
            var buyConfig = financialConfig[2]["1"]; // 取任意配置
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

            if (jutil.now() > midTime) { // 已经过了购买期，检查玩家有没有购买计划
                if (buyIdx < 0) { // 玩家没有购买，那么他不应该看到这个界面
                    cb("youShouldNotSeeThisScene");
                } else { // 玩家购买了计划，那么应该看到领取界面
                    gRes["showScene"] = "rewardScene";
                    financial.getRewardInfo(userUid, financialConfig[4], function(err, res){
                        if (err) cb(err);
                        else {
                            var time = res["time"];
                            if (jutil.compTimeDay(jutil.now(), time)) { // 今天领取过了
                                gRes["rgCnt"] = res["cnt"] - 1;
                                gRes["todayGet"] = true;
                            } else {
                                gRes["rgCnt"] = res["cnt"];
                            }
                            cb(null);
                        }
                    });
                }
            } else { // 还没有过购买期，所有人能看到购买界面
                gRes["showScene"] = "buyScene";
                gRes["eTime"] = midTime;
                cb(null);
            }
        }

    ], function(err){
        if (err) {
            response.echo("financial.get", jutil.errorInfo(err));
        } else {
            response.echo("financial.get", gRes);
        }
    });
};