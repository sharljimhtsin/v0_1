/**
 * 神位争夺（跨服战）排行榜
 * User: peter.wang
 * Date: 14-11-22
 * Time: 上午10:50
 */

var async = require("async");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var gsData = require("../model/gsData");
var gsTabletsUser = require("../model/gsTabletsUser");

function start(postData, response, query) {
    var userUid = query["userUid"];

    var configData  = configManager.createConfig(userUid);

    var issueId = 0;
    var activityConfig = {};
    var topUser = {};
    var top10 = [];
    async.series([
        function (cb) {// 开服时间
            gsTabletsUser.checkUserServerStatus(userUid, function (err, res) {
                if (err) cb(err);
                else if (res == 0) cb("postError");
                else {
                    cb(null);
                }
            });
        },
        function (cb) {// 最近活动号
            gsData.getMaxIssueId(userUid, gsData.GS_TABLETSCOMPETE, function (err, res) {
                if (err) cb(err);
                else if (res == 0) {
                    issueId = "tp"+jutil.now();
                    cb(null);
                }else {
                    issueId = res;
                    cb(null);
                }
            });
        },
        function(cb){ // 活动配制
            gsData.getActivityConfig(userUid,gsData.GS_TABLETSCOMPETE,function(err,res){
                activityConfig = res[2];
                cb(null);
            })
        },
        function (cb) {// 当前用户排行
            gsTabletsUser.getUserTop(userUid, issueId, function(err,res){
                if (err) {
                    topUser = {};//当前玩家不在活动中
                    cb(null);
                }else {
                    topUser = res;
                    cb(null);
                }
            })
        },
        function (cb) {// 排行榜
            gsTabletsUser.getTopList10(userUid, issueId, function(err,res){
                if (err) cb(err);
                else {
                    top10 = res;

                    var top10New = [];
                    if(topUser["userUid"]!=null && topUser["userUid"]==res[0]["userUid"]) {//第一名，即当前玩家，去除top10的第一条
                        for (var i in res) {
                            if (i > 0)top10New.push(res[i]);
                        }
                        top10 = top10New;
                    }
                    cb(null);
                }
            })
        }
    ], function (err, res) {
        if (err) response.echo("pvp.tabletsTopList", jutil.errorInfo(err));
        else {
            response.echo("pvp.tabletsTopList", {"user":topUser,"rankList":top10,"pointRankReward":activityConfig["pointRankReward"]});
        }
    });
}

exports.start = start;