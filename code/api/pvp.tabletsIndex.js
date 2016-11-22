/**
 * 神位争夺（跨服战）首页
 * User: peter.wang
 * Date: 14-11-20
 * Time: 下午17:50
 */

var async = require("async");
var redis = require("../alien/db/redis");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var gsData = require("../model/gsData");
var gsTabletsUser = require("../model/gsTabletsUser");
var userVariable = require("../model/userVariable");
function start(postData, response, query) {
    var userUid = query["userUid"];
    var issueId = 0;
    var serverOpenTime = 0;
    var clickUser = 0;
    var lastTop5 = {};
    async.series([
        function (cb) {// 开服时间
            gsData.getUserServerInfo(userUid, function (err, res) {
                if (err) cb(err);
                else {
                    serverOpenTime = res["openTime"] - 0;
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
                } else {
                    issueId = res;
                    cb(null);
                }
            });
        },
        function (cb) {// 你支持玩家
            redis.user(userUid).s(gsTabletsUser.getGSRedisKey(issueId,"exist:clickUser")).get(function (err, res) {
                if (err) cb(err);
                else {
                    clickUser = res - 0;
                    cb(null);
                }
            });
        },
        function (cb) {// 上期top5
            gsTabletsUser.getLastTop5(userUid, function (err, res) {
                lastTop5 = res;
                cb(null);
            });
        },
        function (cb) {
            userVariable.setVariable(userUid, "tabletsStatus", 0, function (err, res) {
                cb(err);
            });
        }
    ], function (err, res) {
        if (err) response.echo("pvp.tabletsIndex", jutil.errorInfo(err));
        else {
            //console.log(JSON.stringify(lastTop5["top5"]))
            // default:1 配制数据
            response.echo("pvp.tabletsIndex", {"default": lastTop5["default"], "list": lastTop5["top5"], "clickUser": clickUser, "serverOpenTime": serverOpenTime});
        }
    });
}

exports.start = start;