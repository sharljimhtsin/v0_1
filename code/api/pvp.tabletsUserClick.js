/**
 * 神位争夺（跨服战）点赞
 * User: peter.wang
 * Date: 14-11-22
 * Time: 下午
 */

var async = require("async");
var redis = require("../alien/db/redis");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var gsData = require("../model/gsData");
var gsTabletsUser = require("../model/gsTabletsUser");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "clickUserUid") == false) {
        response.echo("pvp.tabletsUserClick", jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var clickUserUid = postData["clickUserUid"];
    var issueId = 0;
    var click = 0;
    var lastclickUserUid = 0; // 之前支持的玩家
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
        function (cb) {// 是否活动中
            gsData.getCurIssueId(userUid, gsData.GS_TABLETSCOMPETE, function (err, res) {
                if (err) cb(err);
                else if (res == 0) cb("gpActivityEnd");
                else {
                    issueId = res;
                    cb(null);
                }
            });
        },
        function (cb) {// 支持者是否为活动玩家
            gsTabletsUser.getTabletsUser(clickUserUid, issueId, function (err, res) {
                if (err) cb(err);
                else if (res == null) {//注册
                    gsTabletsUser.addTabletsUser(clickUserUid, issueId, function (err, res) {
                        cb(err, res);
                    })
                } else {
                    cb(null);
                }
            });
        },
        function (cb) {// 点赞
            gsTabletsUser.clickUser(userUid, clickUserUid, issueId, function (err, res) {
                if (err) cb(err);
                else if (res == 1) {// 点赞成功
                    cb(null);
                } else {            // 你上次支持的玩家
                    lastclickUserUid = res;
                    cb(null);
                }
            });
        },
        function (cb) {
            redis.loginFromUserUid(userUid).l(gsTabletsUser.getGSRedisKey(issueId, "clickUser:" + clickUserUid)).len(function (err, res) {
                click = res - 0;
                cb(null);
            })
        }
    ], function (err, res) {
        if (err) response.echo("pvp.tabletsUserClick", jutil.errorInfo(err));
        else {
            // lastclickUserUid为0，表示点赞成功，否则表示之前以点赞.
            response.echo("pvp.tabletsUserClick", {
                "click": click,
                "clickUserUid": clickUserUid,
                "lastclickUserUid": lastclickUserUid
            });
        }
    });
}

exports.start = start;