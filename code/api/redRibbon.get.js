/******************************************************************************
 * 红缎带军团
 * 获取数据
 * Create by MR.Luo.
 * Create at 14-7-11.
 *****************************************************************************/

var async = require("async");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var redRibbon = require("../model/redRibbon");

exports.start = function(postData, response, query) {
    var userUid = query["userUid"];
    var redRibbonConfig = null;
    var sTime = 0;
    var gRes = {};

    async.series([
        function(cb) { // 取配置
            activityConfig.getConfig(userUid, redRibbon.ACTIVITY_CONFIG_NAME, function(err, res){
                if (err) cb(err);
                else {
                    var eTime = res[5];
                    var endTime = eTime + 60 * 60 * 24 * 1; // 推迟一天
                    if ((jutil.now() > res[4]) && (jutil.now() < endTime)) {
                        sTime = res[4];
                        if (!res[2] || !res[3]) {
                            cb("configError");
                            return;
                        }
                        gRes["eTime"] = res[5]; // 活动结束时间
                        gRes["config"] = res[2]; // 动态配置，奖励数据
                        redRibbonConfig = res[3]; //静态配置

                        if (!res[0]) { // 活动已经结束
                            gRes["activityEnd"] = true;
                        }
                        cb(null);
                    } else {
                        cb("notOpen");
                    }
                }
            });
        },
        function(cb) { // 取数据
            redRibbon.getData(userUid, sTime, function(err, res){
                if (err) cb(err);
                else {
                    gRes["score"] = res["score"]; // 积分
                    gRes["scoreMask"] = res["scoreMask"]; // 积分标志字

                    var dayGetNum = res["dayGetNum"];
                    if (dayGetNum >= redRibbonConfig["zeniTime"]) {
                        gRes["costType"] = "ingot"; // 消费类别
                        gRes["cost"] = redRibbonConfig["imeggaPay"];
                    } else {
                        gRes["costType"] = "gold";
                        gRes["cost"] = redRibbonConfig["zeniPay"];
                    }
                    cb(null);
                }
            });
        }
    ], function(err){
        if (err) {
            response.echo("redRibbon.get", jutil.errorInfo(err));
        } else {
            response.echo("redRibbon.get", gRes);
        }
    });
};