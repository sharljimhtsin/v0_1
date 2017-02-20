/**
 * Created by xiazhengxin on 2017/1/18.
 */

var async = require("async");
var jutil = require("../utils/jutil");
var modelUtil = require("../model/modelUtil");
var equipment = require("../model/equipment");
var upStar = require("../model/upStarEquip");
var upStarRecycle = require("../model/upStarRecycle");
var mongoStats = require("../model/mongoStats");
var user = require("../model/user");
var TAG = "upStar.equip.up";
var DEBUG = true;

function start(postData, response, query, callBack) {
    if (jutil.postCheck(postData, "equipmentUid", "type") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var equipmentUid = postData["equipmentUid"];
    var type = postData["type"];
    var configData;
    var userData = [];
    var starData;
    var singleData;
    var equipmentId;
    var starEquipData;
    var starRecycleData;
    var recycleData;
    var userObj;
    async.series([function (cb) {
        upStar.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                configData = jutil.deepCopy(res[2]);
                cb();
            }
        });
    }, function (cb) {
        equipment.getEquipment(userUid, function (err, res) {
            if (res && res.hasOwnProperty(equipmentUid)) {
                equipmentId = res[equipmentUid]["equipmentId"];
                cb();
            } else {
                cb(err ? err : "NULL");
            }
        });
    }, function (cb) {
        upStar.getStarData(userUid, function (err, res) {
            starData = res;
            cb(err);
        });
    }, function (cb) {
        upStarRecycle.getStarData(userUid, function (err, res) {
            starRecycleData = res;
            cb(err);
        });
    }, function (cb) {
        if (starData && starData.hasOwnProperty(equipmentUid)) {
            singleData = starData[equipmentUid];
            cb();
        } else {
            cb("NULL");
        }
    }, function (cb) {
        var msg = null;
        var level = singleData["level"];
        var lucky = singleData["lucky"];
        var luckyDay = singleData["luckyDay"];
        var nextLevel = (parseInt(level) + 1) + "";
        var expPer = parseInt(configData["expPer"]);
        var attrPer = parseInt(configData["attrPer"]);
        var attrExtraConfig = configData["attrExtra"];
        var levelConfig = configData["level"];
        if (levelConfig.hasOwnProperty(nextLevel)) {
            var expConfig = parseInt(levelConfig[nextLevel]["exp"]);
            var luckyConfig = parseInt(levelConfig[nextLevel]["lucky"]);
            var failConfig = parseInt(levelConfig[nextLevel]["fail"]);
            var baseConfig = parseFloat(levelConfig[nextLevel]["base"]);
            lucky = jutil.compTimeDay(luckyDay, jutil.now()) ? lucky : 0;
            if (DEBUG) {
                console.log(baseConfig, lucky, luckyConfig);
            }
            var prob = baseConfig + (1 - baseConfig) * (lucky / luckyConfig);
            var random = Math.random();
            if (DEBUG) {
                console.log(prob, random);
            }
            if (prob > random) {
                singleData["exp"] += expPer;
                singleData["attr"] += attrPer;
            } else {
                if (jutil.compTimeDay(luckyDay, jutil.now())) {
                    singleData["lucky"] += failConfig;
                } else {
                    singleData["lucky"] = failConfig;
                    singleData["luckyDay"] = jutil.now();
                }
            }
            if (singleData["exp"] >= expConfig) {
                //升级
                singleData["exp"] = 0;
                singleData["level"] = nextLevel;
                singleData["lucky"] = 0;
                singleData["luckyDay"] = jutil.now();
                //加成
                var add = attrExtraConfig[singleData["type"]][nextLevel];
                singleData["add"] = add;
                //消耗
                var count = configData["count"];
                var item = configData["item"];
                singleData["nextPriceItem"] = {"id": item[nextLevel], "count": count["item"]};
                singleData["nextPriceIngot"] = {"id": "ingot", "count": count["ingot"]};
                //下级参数
                level = singleData["level"];
                nextLevel = (parseInt(level) + 1) + "";
                levelConfig = configData["level"];
                if (levelConfig.hasOwnProperty(nextLevel)) {
                    expConfig = parseInt(levelConfig[nextLevel]["exp"]);
                    luckyConfig = parseInt(levelConfig[nextLevel]["lucky"]);
                    failConfig = parseInt(levelConfig[nextLevel]["fail"]);
                    baseConfig = parseFloat(levelConfig[nextLevel]["base"]);
                    singleData["lucky_total"] = luckyConfig;
                    singleData["exp_total"] = expConfig;
                    singleData["fail_total"] = failConfig;
                    singleData["base_total"] = baseConfig;
                    singleData["add_next"] = attrExtraConfig[singleData["type"]][nextLevel];
                } else {
                    singleData["lucky_total"] = 0;
                    singleData["exp_total"] = 0;
                    singleData["fail_total"] = 0;
                    singleData["base_total"] = 0;
                }
            } else {
                singleData["add_next"] = attrExtraConfig[singleData["type"]][nextLevel];
            }
        } else {
            msg = "hit the top";
        }
        cb(msg);
    }, function (cb) {
        user.getUser(userUid, function (err, res) {
            userObj = res;
            cb(err);
        });
    }, function (cb) {
        var price = [];
        if (type == "0") {
            price.push(singleData["nextPriceIngot"]);
        } else {
            price.push(singleData["nextPriceItem"]);
        }
        if (starRecycleData.hasOwnProperty(equipmentUid)) {
            recycleData = starRecycleData[equipmentUid];
        } else {
            recycleData = {};
        }
        async.eachSeries(price, function (item, eaCb) {
            upStar.checkIfEnough(userUid, item, function (err, isOk) {
                if (err) {
                    eaCb(err);
                } else if (isOk) {
                    modelUtil.addDropItemToDB(item["id"], item["count"] * -1, userUid, 1, 1, function (err, res) {
                        switch (item["id"]) {
                            case "ingot":
                                mongoStats.expendStats(item["id"], userUid, "127.0.0.1", userObj, mongoStats.UPSTAR1, item["count"]);
                                break;
                            default:
                                mongoStats.expendStats(item["id"], userUid, "127.0.0.1", userObj, mongoStats.UPSTAR5, item["count"]);
                                break;
                        }
                        userData.push(res);
                        if (recycleData.hasOwnProperty(item["id"])) {
                            recycleData[item["id"]] = parseInt(recycleData[item["id"]]) + parseInt(item["count"]);
                        } else {
                            recycleData[item["id"]] = parseInt(item["count"]);
                        }
                        eaCb(err);
                    });
                } else {
                    eaCb("not enough");
                }
            });
        }, function (err, res) {
            cb(err);
        });
    }, function (cb) {
        if (DEBUG) {
            console.log(singleData);
        }
        starData[equipmentUid] = singleData;
        upStar.setStarData(userUid, starData, cb);
    }, function (cb) {
        if (DEBUG) {
            console.log(recycleData);
        }
        starRecycleData[equipmentUid] = recycleData;
        upStarRecycle.setStarData(userUid, starRecycleData, cb);
    }, function (cb) {
        //兼容客户端等级从1开始
        singleData["level"] = parseInt(singleData["level"]) + 1;
        cb();
    }, function (cb) {
        upStar.getAddition(userUid, function (err, res) {
            starEquipData = res;
            cb(err);
        });
    }, function (cb) {
        if (starEquipData.hasOwnProperty(equipmentUid)) {
            var addObj = starEquipData[equipmentUid];
            singleData["equipStarAddValue"] = addObj;
        } else {
            singleData["equipStarAddValue"] = {};
        }
        cb();
    }], function (err, res) {
        // 是否需要回调
        if (callBack) {
            callBack(err, res, {
                "userData": userData,
                "starData": singleData
            });
        }
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            response.echo(TAG, {
                "userData": userData,
                "starData": singleData
            });
        }
    });
}

exports.start = start;