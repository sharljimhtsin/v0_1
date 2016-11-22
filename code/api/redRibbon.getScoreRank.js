/******************************************************************************
 * 军团宝藏
 * 获取积分排行数据
 * Create by MR.Luo.
 * Create at 14-7-18.
 *****************************************************************************/

var async = require("async");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var redRibbon = require("../model/redRibbon");
var user = require("../model/user");

exports.start = function(postData, response, query) {
    var userUid = query["userUid"];
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
                    gRes["score"] = res["score"]; // 我的积分
                    cb(null);
                }
            });
        },
        function(cb) { // 排名数据
            redRibbon.getRankingList(userUid, sTime, function(err, res){
                if (err) cb(err);
                else {
                    var rankList = [];
                    async.eachSeries(Object.keys(res), function(key, esCb){
                        var iData = res[key];
                        if (iData == null || iData == undefined) {
                            esCb(null);
                            return;
                        }
                        user.getUser(iData["userUid"], function(err, ures){
                            if (err) esCb(err);
                            else {
                                rankList.push({
                                    "name" : ures["userName"],
                                    "score" : iData["score"]
                                });
                                esCb(null);
                            }
                        });
                    }, function(err){
                        gRes["rankList"] = rankList;
                        cb(err);
                    });
                }
            });
        }
    ], function(err){
        if (err) {
            response.echo("redRibbon.getScoreRank", jutil.errorInfo(err));
        } else {
            response.echo("redRibbon.getScoreRank", gRes);
        }
    });
};