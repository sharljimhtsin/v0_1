/**
 * Created with JetBrains WebStorm.
 * User: za
 * Date: 14-10-28
 * Time: 下午4:36
 * To change this template use File | Settings | File Templates.
 */
var user = require("../model/user");
var jutil = require("../utils/jutil");
var async = require("async");
var configManager = require("../config/configManager");
var integral = require("../model/integralBattle");
var item = require("../model/item");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "fight") == false) {
        response.echo("integralBattle.get", jutil.errorInfo("postError"));
        return false;
    }
    var userUid = query["userUid"];
    var fight = postData["fight"];
    var returnData = {};
    var sTime;
    var eTime;
    var key = "";
    var itemId = "156003";
    var openLv = 0;
    var badgeShop = [];
    var residueTimesList = [];
    var isAll = 0;
    async.series([function (cb) {
        item.getItem(userUid, itemId, function (err, res) {
            if (err)cb(err);
            else {
                if (res == null || res["number"] == null) {
                    returnData["badageCt"] = 0;
                } else {
                    returnData["badageCt"] = res["number"] - 0;
                }
                cb(null);
            }
        });
    }, function (cb) {//取配置
        integral.getConfig(userUid, function (err, res) {
            if (err)cb(err);
            else {
                if (res[2] == undefined) {
                    cb("configError");
                } else {
                    sTime = res[0];
                    eTime = res[1];
                    key = res[2]["key"];
                    returnData["config"] = res[2];
                    openLv = res[2]["openLv"];
                    badgeShop = res[2]["badgeShop"];
                    isAll = parseInt(res[2]["isAll"]) || 0;
                    cb(null);
                }
            }
        });
    }, function (cb) {
        user.getUser(userUid, function (err, res) {
            if (err)cb(err);
            else {
                if (res == null) {
                    cb("noThisUser");
                } else {
                    if (res["lv"] < openLv) {
                        cb("lvNotEnough");
                    } else {
                        cb();
                    }
                }
            }
        });
    }, function (cb) {
        integral.getBattleTimes(userUid, key, isAll, function (err, res) {
            if (err)cb(err);
            else {
                returnData["buyBattleTimes"] = res;
                cb(null);
            }
        });
    }, function (cb) {
        integral.getUserData(userUid, sTime, function (err, res) {
            if (err)cb(err);
            else { //residueTimesList--剩余兑换次数列表（商城）
                var endTime = eTime - 86400;
                returnData["userData"] = {
                    "winTimes": res["data"],
                    "dataTime": sTime,
                    "eTime": endTime,
                    "point": res["status"],
                    "battleTimes": res["statusTime"],
                    "residueTimesList": res["arg"]["residueTimesList"]
                };
                cb(null);
            }
        });
    }, function (cb) {//取用户方战斗力
        integral.freshFight(userUid, fight, isAll, function (err, res) {
            if (err)cb(err);
            else {
                returnData["myFight"] = res;
                cb(null);
            }
        });
    }, function (cb) {
        integral.getFreshTimes(userUid, key, isAll, function (err, res) {
            if (err)cb(err);
            else {
                returnData["freshTimes"] = res - 0;
                cb(null);
            }
        });
    }, function (cb) {//取敌方战斗力（随机3名） 根据对手的战斗力取到对应的徽章个数
        integral.getFightList(userUid, isAll, function (err, res) {
            if (err)cb(err);
            else {
                returnData["FightList"] = res;
                cb(null);
            }
        });
    }, function (cb) {
        integral.getBattleResultList(userUid, key, isAll, function (err, res) {
            if (err)cb(err);
            else {
                var battleResultList = [];
                for (var kk in res) {
                    battleResultList.push({"userUid": res[kk]["userUid"], "status": res[kk]["status"]});
                }
                returnData["resultList"] = battleResultList; //记录胜负玩家列表
                cb();
            }
        });
    }, function (cb) {//判断活动开启状态
        integral.getFightList(userUid, isAll, function (err, res) {
            if (err)cb(err);
            else {
                if (res.length < 1) {// || eTime - 86400 <= jutil.now()
                    returnData["noMatch"] = 1;
                    cb();
                } else {
                    returnData["noMatch"] = 0;
                    cb(null);
                }
            }
        });
    }], function (err) {
        if (err) {
            response.echo("integralBattle.get", jutil.errorInfo(err));
        } else {
            response.echo("integralBattle.get", returnData);
        }
    });
}

exports.start = start;