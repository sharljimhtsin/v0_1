/******************************************************************************
 * 每日签到
 * 奖励领取模块
 *****************************************************************************/

var async = require("async");
var jutil = require("../utils/jutil");
var mongoStats = require("../model/mongoStats");
var configManager = require("../config/configManager");
var modelUtil = require("../model/modelUtil");
var signInMod = require("../model/signInNew");
var vitality = require("../model/vitality");
var TAG = "signInNew.reward";

exports.start = function (postData, response, query) {
    var userUid = query["userUid"];
    var rtnArr = [];
    var rwCfg = null; // 奖励配置
    var rwId = null;
    var rwCnt = null;
    var signInData = null;
    var canDouble = false;
    var date = new Date(jutil.now() * 1000);
    var curMonth = date.getMonth() + 1;
    var curDate = date.getDate();
    var configManager = require("../config/configManager");
    var configMgr = configManager.createConfig(userUid);
    var signConfig = configMgr.getConfig("signIn") || {};
    var monthConfig = signConfig[curMonth];
    async.series([
        function (cb) { // 获取数据
            signInMod.getData(userUid, function (err, res) {
                signInData = res;
                cb(err);
            });
        },
        function (cb) { // 判断能否领奖
            var signInCount = signInData["signInCount"];
            var getMask = signInData["getMask"]; // getMask < 2 表示今天有可能可以领取，等于2表示已经领取
            var oldVipLv = signInData["oldVipLv"];
            var newVipLv = signInData["newVipLv"];
            if (getMask == 0) { // 今天没领过，可以领取
                rwCfg = monthConfig[curDate];
                canDouble = true;
                cb();
                return;
            } else if (getMask == 1) { // 今天领过，判断VIP双倍
                var todayRwCfg = monthConfig[curDate];
                if (todayRwCfg["isDouble"] == 1) {
                    var dVipLv = todayRwCfg["doubleVip"];
                    if (oldVipLv < dVipLv && newVipLv >= dVipLv) {
                        rwCfg = todayRwCfg;
                        cb();
                        return;
                    }
                }
            }
            cb("alreadyGet");
        },
        function (cb) { // 更新数据
            var oldVipLv = signInData["oldVipLv"];
            var newVipLv = signInData["newVipLv"];
            var signInCount = signInData["signInCount"];
            var getMask = signInData["getMask"];
            var monthData = signInData["monthConfig"];
            if (canDouble) { // 每天第一次领奖的时候更新签到次数
                signInCount++;
            }
            rwId = rwCfg["rewardId"];
            rwCnt = rwCfg["rewardCount"];
            if (getMask == 0) { // 没有领取过
                if (rwCfg["isDouble"] == 1) { // 判断现在能否领取双倍
                    if (newVipLv >= rwCfg["doubleVip"]) { // 现在可以领取双倍
                        getMask = 2;
                        rwCnt = rwCnt * 2;
                    } else { // 有双倍，但是现在不能领取
                        getMask = 1;
                    }
                } else { // 今天没双倍，一步到位
                    getMask = 2;
                }
            } else { // 已经领过了，现在领取VIP双倍
                getMask = 2;
            }
            monthData[curDate]["getMask"] = getMask;
            signInMod.updateData(userUid, curMonth, curDate, signInCount, getMask, newVipLv, monthData, cb);
        },
        function (cb) { // 发放奖励
            __rwHandler(userUid, rwId, rwCnt, function (err, res) {
                if (err) console.error(err);
                else if (res) {
                    rtnArr.push(res);
                }
                cb();
            });
        }
    ], function (err) {
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            response.echo(TAG, rtnArr);
            vitality.vitality(userUid, "loginCard", {"completeCnt": 1}, function () {
            });
        }
    });
};

/**
 * 发奖励
 * @param userUid
 * @param id
 * @param count
 * @param cb
 * @private
 */
function __rwHandler(userUid, id, count, cb) {
    mongoStats.dropStats(id, userUid, 0, null, mongoStats.DAILY_SIGNIN, count);
    modelUtil.addDropItemToDB(id, count, userUid, 0, 1, function (err, res) {
        cb(err, res);
    });
}