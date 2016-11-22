/**
 * Created by xiayanxin on 2016/9/20.
 *
 * 跨服激戰 積分排行榜
 */

var pvptop = require("../model/pvpTopCross");
var async = require("async");
var jutil = require("../utils/jutil");
var TAG = "pvp.cross.rankList";

function start(postData, response, query) {
    var userUid = query["userUid"];
    var isAll;
    var key;
    var eTime;
    var currentConfig;
    var returnData = {};
    async.series([
        function (cb) {
            pvptop.getConfig(userUid, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    isAll = parseInt(res[2]["isAll"]) || 0;
                    key = res[2]["key"] || "1";
                    currentConfig = res[2];
                    eTime = res[1];
                    cb();
                }
            });
        },
        function (cb) {
            pvptop.getRankList(userUid, isAll, key, currentConfig, 7, function (err, res) {
                returnData["data"] = res;
                cb(err);
            });
        },
        function (cb) {
            pvptop.getRewardStatus(userUid, function (err, res) {
                returnData["rewardStatus"] = res;
                cb(err);
            });
        },
        function (cb) {
            if (jutil.now() > eTime - 86400 * 2) {
                returnData["rewardTime"] = 1;
            } else {
                returnData["rewardTime"] = 0;
            }
            cb();
        }
    ], function (err, res) {
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            response.echo(TAG, returnData);
        }
    });
}

exports.start = start;