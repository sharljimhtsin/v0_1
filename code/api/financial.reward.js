/******************************************************************************
 * 理财计划
 * 奖励领取接口
 * Create by MR.Luo.
 * Create at 14-7-24.
 *****************************************************************************/

var async = require("async");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var financial = require("../model/financialPlan");
var user = require("../model/user");
var mongoStats = require("../model/mongoStats");
var modelUtil = require("../model/modelUtil");

exports.start = function(postData, response, query) {

    var userUid = query["userUid"];
    var buyIdx = -1; // 购买的计划索引

    var financialConfig = null; // 活动配置
    var buyConfig = null; // 要购买的计划的配置
    var userData = null; // 用户数据

    var rgCnt = 0; // 已经领奖次数

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
                        buyIdx = idx;
                        cb(null);
                    } else { // 没有购买计划，不能领奖
                        cb("notBuy");
                    }
                }
            });
        },

        function(cb) { // 判断能否领奖
            var aConfig = financialConfig[2];

            buyConfig = aConfig[buyIdx]; // 购买的计划的配置
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

            if (jutil.now() < midTime) { // 还没到领奖时间
                cb("canNotReward");
                return;
            }

            financial.getRewardInfo(userUid, financialConfig[4], function(err, res){
                if (err) cb(err);
                else {
                    rgCnt = res["cnt"];
                    if (rgCnt >= daysToGet) { // 奖励已经全部领取
                        cb("alreadyGet");
                    } else {
                        if (jutil.compTimeDay(jutil.now(), res["time"])) { // 今天已经领过了
                            cb("alreadyGet");
                        } else {
                            cb(null);
                        }
                    }
                }
            });
        },

        function(cb) { // 发奖
            var reward = buyConfig["reward"] || {};
            var rwInfo = reward[rgCnt + 1]; // 从1开始
            if (!rwInfo) {
                cb("configError");
                return;
            }

            async.eachSeries(Object.keys(rwInfo), function(key, esCb){
                var rwItem = rwInfo[key];
                __rwHandler(userUid, rwItem["id"], rwItem["count"], function(err, res){
                    if (err) console.error(err);
                    else {
                        gRes.updateList.push(res);
                        esCb(null);
                    }
                });
            }, function(err){
                cb(null);
            });
        },

        function(cb) { // 更新领奖数据
            financial.setRewardInfo(userUid, rgCnt + 1, function(err, res){
                if (err) console.error(err);
                cb(null);
            });
        }

    ], function(err){
        if (err) {
            response.echo("financial.reward", jutil.errorInfo(err));
        } else {
            response.echo("financial.reward", gRes);
        }
    });
};

function __rwHandler(userUid, id, count, cb) {
    mongoStats.dropStats(id, userUid, 0, null, mongoStats.FINANCIAL, count);
    switch (id) {
        default:
            modelUtil.addDropItemToDB(id,count,userUid,0,1,function(err,res) {
                if (err) cb(err);
                else {
                    cb(null, res);
                }
            });
            break;
    }
}