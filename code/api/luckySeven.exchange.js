/**
 * Created with JetBrains WebStorm.
 * User: hewei
 * Date: 14-7-21
 * Time: 下午4:20
 * To change this template use File | Settings | File Templates.
 */
var jutil = require("../utils/jutil");
var async = require("async");
var activityConfig = require("../model/activityConfig");
var item = require("../model/item");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");
function start(postData, response, query) {
    if (jutil.postCheck(postData,"index") == false) {
        response.echo("luckySeven.exchange", jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var index = postData["index"];
    var shopItems = null;
    var chip = 0;
    var dropItemData = null;
    var chipData = null;
    var needChip = 0;
    async.series([
        function(cb) {//获取拉拔活动兑换物品
            activityConfig.getConfig(userUid, "lucky777", function(err, res) {
                if (res != null) {
                    if (res[0]) {//开启
                        var rewardsConfig = res[2];
                        if (rewardsConfig) {
                            shopItems = rewardsConfig["shop"];
                            cb(null);
                        } else {
                            cb("dbError");
                        }
                    } else {
                        cb("dbError");
                    }
                } else {
                    cb("dbError");
                }
            });
        },
        function(cb) {//获取筹码
            item.getItem(userUid, "152801", function(err, res) {
                if (err)
                    cb("dbError");
                else {
                    if (res)
                        chip = res["number"] - 0;
                    cb(null);
                }
            });
        },

        function(cb) {//判断筹码是否足够
            var item = shopItems[index];
            if (item) {
                needChip = item["cost"] - 0;
                if (chip >= needChip) {
                    cb(null);
                } else {
                    cb("chipNotEnough");
                }
            } else {
                cb("dbError");
            }
        },

        function(cb) {//兑换
            var item = shopItems[index];
            stats.dropStats(item["id"], userUid, "127.0.0.1", null, mongoStats.luckySevenExchange, item["count"]);
            modelUtil.addDropItemToDB(item["id"], item["count"], userUid, 0, 1, function(err, res) {
                if (err)
                    cb("dbError");
                else {
                    dropItemData = res;
                    mongoStats.dropStats(item["id"], userUid, "127.0.0.1", null, mongoStats.LUCKYSEVEN, item["count"]);
                    cb(null);
                }
            });
        },

        function(cb) {//更新筹码
            item.updateItem(userUid, "152801", 0 - needChip, function(err, res) {
                if (err)
                    cb("dbError");
                else {
                    chipData = res;
                    mongoStats.expendStats("152801",userUid,"127.0.0.1",null,mongoStats.E_LUCKYSEVEN,needChip);
                    cb(null);
                }
            });
        }
    ], function (err, result) {
        if (err)
            response.echo("luckySeven.exchange", jutil.errorInfo(err));
        else {
            response.echo("luckySeven.exchange", {"dropItemData":dropItemData,"chipData":chipData});
        }
    });
}

exports.start = start;