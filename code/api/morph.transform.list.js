/**
 * Created by xiazhengxin on 2015/4/2 17:44.
 *
 * 异度空间 异度转化 首页
 */

var async = require("async");
var activityConfig = require("../model/activityConfig");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var morphData = require("../model/morphData");
var morphPromoData = require("../model/morphPromoData");
var hero = require("../model/hero");
var TAG = "morph.transform.list";

function start(postData, response, query) {
    var userUid = query["userUid"];
    var configData;
    var key;
    var list;
    var isFirst = false;
    var item;
    var item2;
    var limitList = {};
    var normalList = {};
    var costConfig;
    var totalTime;
    var frozenTime;
    var rewardCount;
    var rewardCountAlt;
    var isDouble = false;
    var isUpdate = false;
    var timeDiscount = 1;
    var costDiscount = 1;
    var avoidList;
    var isAvoid = false;
    var userHeroList;
    async.series([function (cb) {
        morphData.getConfig(userUid, true, function (err, res) {
            if (err) {
                cb(err);
            } else {
                configData = res[2];
                key = configData["key"];
                costConfig = configData["cost"];
                totalTime = configData["totalTime"];
                frozenTime = configData["frozenTime"];
                rewardCount = configData["rewardCount"];
                rewardCountAlt = configData["rewardCountAlt"];
                cb();
            }
        });
    }, function (cb) {
        morphData.getConfig(userUid, false, function (err, res) {
            if (err) {
                cb(err);
            } else {
                var tmp = res[2];
                avoidList = Object.keys(tmp["reward"]);
                cb();
            }
        });
    }, function (cb) {
        morphPromoData.isActivityOpen(userUid, function (err, isOpen, res) {
            if (isOpen) {
                timeDiscount = res["timeDiscount"];
                costDiscount = res["costDiscount"];
            }
            cb(err);
        });
    }, function (cb) {
        morphData.getTransformList(userUid, key, function (err, res) {
            if (err) {
                cb(err);
            } else {
                list = res;
                cb(null);
            }
        });
    }, function (cb) {
        morphData.getDoubleStatus(userUid, key, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res == null) {
                    item = {};
                } else {
                    item = {
                        "id": res["id"],
                        "coolTime": res["totalTime"] - (jutil.now() - res["startTime"])
                    }
                }
                cb();
            }
        });
    }, function (cb) {
        var queue = [0, 1, 1, 1, 1, 1, 2, 2, 2];
        if (list == null) {
            isFirst = true;
            list = {};
            for (var i in queue) {
                var index = i - 0 + 1;
                var type = queue[i];
                list[index + ""] = {
                    "status": (index == 1 ? "enable" : "disable"),
                    "startTime": 0,
                    "extraTime": 0,
                    "totalTime": 60 * 60 * totalTime[type],
                    "enableTime": 0,
                    "frozenTime": 60 * 60 * (type == 2 ? frozenTime : 0),
                    "heroId": "",
                    "heroUid": "",
                    "type": type,
                    "index": index
                };
            }
        }
        cb();
    }, function (cb) {
        hero.getHero(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                userHeroList = res;
                cb();
            }
        });
    }, function (cb) {
        async.eachSeries(Object.keys(list), function (item, eachCb) {
            var eachOne = list[item];
            if (eachOne["heroId"] == "") {
                eachCb();
            } else {
                // 人物失效
                if (!userHeroList.hasOwnProperty(eachOne["heroUid"])) {
                    list[item]["heroId"] = "";
                    list[item]["heroUid"] = "";
                    isUpdate = true;
                }
                eachCb();
            }
        }, function (err, res) {
            cb(err);
        });
    }, function (cb) {
        if (isFirst || isUpdate) {
            morphData.setTransformList(userUid, key, list, cb);
        } else {
            cb();
        }
    }, function (cb) {
        morphData.getDoubleStatus(userUid, key, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res && res["totalTime"] > jutil.now() - res["startTime"]) {
                    isDouble = true;
                }
                cb(null);
            }
        });
    }, function (cb) {
        // 格式化输出方式
        for (var index in list) {
            var formattedItem = {};
            var item = list[index];
            if (item["type"] == "2" && item["status"] == "enable") {
                var now = jutil.now();
                var enableTime = item["enableTime"] - 0;
                if (now - enableTime > item["frozenTime"]) {
                    formattedItem["status"] = 0;
                    formattedItem["enableTime"] = 0;
                } else {
                    formattedItem["status"] = 1;
                }
            } else {
                formattedItem["status"] = item["status"] == "enable" ? 1 : 0;
            }
            formattedItem["coolTime"] = morphData.getRealTimeTotalTime(configData, index) * timeDiscount - (jutil.now() - item["startTime"]) - item["extraTime"];
            formattedItem["openTime"] = item["frozenTime"] - (jutil.now() - item["enableTime"]);
            formattedItem["heroId"] = item["heroId"];
            formattedItem["heroUid"] = item["heroUid"];
            if (avoidList.indexOf(item["heroId"] + "") >= 0) {
                isAvoid = true;
            } else {
                isAvoid = false;
            }
            formattedItem["reward"] = {
                "id": item["type"] == "2" && item["heroId"] != "" ? "153401" : item["heroId"],
                "count": (isDouble ? 2 : 1) * (isAvoid ? rewardCount[item["type"]] : rewardCountAlt[item["type"]])
            };
            switch (item["type"]) {
                case 0:
                    normalList[index] = formattedItem;
                    break;
                case 1:
                    normalList[index] = formattedItem;
                    break;
                case 2:
                    limitList[index] = formattedItem;
                    break;
            }
        }
        cb(null);
    }, function (cb) {
        var tmp = jutil.deepCopy(costConfig);
        for (var aa in tmp) {
            for (var bb in tmp[aa]) {
                tmp[aa][bb]["count"] = tmp[aa][bb]["count"] * costDiscount;
            }
        }
        tmp["normal"] = tmp["1"];
        tmp["limit"] = tmp["2"];
        delete tmp["1"];
        delete tmp["2"];
        costConfig = tmp;
        cb();
    }, function (cb) {
        var itemConfig = configManager.createConfig(userUid).getConfig("item");
        item2 = {"id": "155301", "price": itemConfig["155301"]["salePrice"]}
        cb();
    }], function (err, res) {
        if (err) response.echo(TAG, jutil.errorInfo(err));
        else {
            response.echo(TAG, {
                "item": item,
                "item2": item2,
                "limitList": limitList,
                "normalList": normalList,
                "config": costConfig
            });
        }
    });
}

exports.start = start;
