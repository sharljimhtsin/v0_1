/**
 * Created by xiazhengxin on 2017/2/7.
 */

var async = require("async");
var jutil = require("../utils/jutil");
var modelUtil = require("../model/modelUtil");
var equipment = require("../model/equipment");
var upStar = require("../model/upStarEquipRefine");
var configManager = require("../config/configManager");
var upStarRecycle = require("../model/upStarRecycle");
var mongoStats = require("../model/mongoStats");
var user = require("../model/user");
var TAG = "upStar.equip.refine.up";
var DEBUG = true;

function start(postData, response, query, callBack) {
    if (jutil.postCheck(postData, "equipmentUid", "itemId", "itemCount") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var equipmentUid = postData["equipmentUid"];
    var itemIds = postData["itemId"];
    var itemCounts = postData["itemCount"];
    if (typeof (itemIds) != "object" && typeof (itemCounts) != "object") {
        try {
            itemIds = JSON.parse(postData["itemId"]);
            itemCounts = JSON.parse(postData["itemCount"]);
        } catch (e) {
            itemIds = [];
            itemCounts = [];
            response.echo(TAG, jutil.errorInfo("postError"));
            return;
        }
    }
    var configData;
    var userData = [];
    var starData;
    var singleData;
    var equipmentId;
    var price = [];
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
        var configItem = configManager.createConfig(userUid).getConfig("item");
        var expAdd = 0;
        for (var i = 0; i < itemIds.length; i++) {
            var itemId = itemIds[i];
            var itemCount = itemCounts[i];
            price.push({"id": itemId, "count": itemCount});
            var addValueItem = configItem[itemId] ? configItem[itemId]["typeValue"] : 0;
            expAdd += parseInt(addValueItem) * itemCount;
        }
        var starId = singleData["star"];
        var type = singleData["type"];
        singleData["exp"] += expAdd;
        var attrNormalConfig = configData["attr"][type]["normal"][starId];
        var attrExtraConfig = configData["attr"][type]["extra"][starId];
        var levelConfig = jutil.deepCopy(configData["exp"][starId]);
        levelConfig["50"] = 0;
        var tmpLevel = -1;
        var tmpAttr = 0;
        var tmpAdd = 0;
        for (var lv in levelConfig) {
            if (DEBUG) {
                console.log(singleData["exp"], levelConfig[lv], singleData["level"], lv);
            }
            //加成
            tmpAdd += attrExtraConfig.hasOwnProperty(lv) ? parseInt(attrExtraConfig[lv]) : 0;
            if (parseInt(singleData["level"]) > lv) {
                //加成
                tmpAttr += attrNormalConfig;
                continue;
            } else if (parseInt(singleData["exp"]) >= levelConfig[lv]) {
                //扣经验
                singleData["exp"] = parseInt(singleData["exp"]) - parseInt(levelConfig[lv]);
                //加成
                tmpAttr += attrNormalConfig;
                tmpLevel = lv;
                continue;
            } else {
                tmpLevel = lv;
                break;
            }
        }
        if (tmpLevel > 0) {
            if (singleData["level"] != tmpLevel) {
                //经验清零
                singleData["exp"] = 0;
            }
            singleData["level"] = tmpLevel;
            //加成
            singleData["attr"] = tmpAttr;
            singleData["add"] = tmpAdd;
            //下级参数
            var level = singleData["level"];
            singleData["add_next"] = attrNormalConfig;
            if (levelConfig.hasOwnProperty(level)) {
                singleData["exp_total"] = levelConfig[level];
            } else {
                singleData["exp_total"] = 0;
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
                        mongoStats.expendStats(item["id"], userUid, "127.0.0.1", userObj, mongoStats.UPSTAR4, item["count"]);
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
        upStar.getAddition(userUid, function (err, res) {
            starEquipData = res;
            cb(err);
        });
    }, function (cb) {
        if (starEquipData.hasOwnProperty(equipmentUid)) {
            var addObj = starEquipData[equipmentUid];
            singleData["equipStarRefineAddValue"] = addObj;
        } else {
            singleData["equipStarRefineAddValue"] = {"attack": 0, "defence": 0, "hp": 0, "level": 1};
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
