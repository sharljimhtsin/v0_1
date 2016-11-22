/**
 * 神位争夺（跨服战）玩家阵型
 * User: peter.wang
 * Date: 14-12-11
 * Time: 下午
 */

var async = require("async");
var redis = require("../alien/db/redis");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var pvptop = require("../model/pvptop");
var gsData = require("../model/gsData");
var gsTabletsUser = require("../model/gsTabletsUser");

/**
 * tablets玩家阵位信息
 * @param postData
 * @param response
 * @param query
 */
function start(postData, response, query) {
    if (jutil.postCheck(postData, "userUid") == false) {
        response.echo("pvp.formation", jutil.errorInfo("postError"));
        return;
    }

    var issueId = 0;
    var formationInfo = null;
    var userUid = postData["userUid"];
    async.series([
        function (cb) {// 最近活动号
            gsData.getMaxIssueId(userUid, gsData.GS_TABLETSCOMPETE, function (err, res) {
                if (err) cb(err);
                else if (res == 0) {
                    issueId = "tp" + jutil.now();
                    cb(null);
                } else {
                    issueId = res;
                    cb(null);
                }
            });
        },
        function (cb) { ///取用户阵容
            redis.user(userUid).s(gsTabletsUser.getGSRedisKey(issueId, "userBattleData")).getObj(function (err, res) {
                if (err || res == null) {
                    pvptop.getPvpTopFormation(userUid, function (err, res) {
                        if (err || res == null) {
                            cb(null);
                        } else {
                            formationInfo = res;
                            cb(null);
                        }
                    });
                } else {
                    formationInfo = res["teamInfo"];
                    cb(null);
                }
            });
        }
    ], function (err) {
        if (err) {
            response.echo("pvp.tabletsFormation", jutil.errorInfo(err));
        } else {
            response.echo("pvp.tabletsFormation", formationInfo);
        }
    });
}

exports.start = start;