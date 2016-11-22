/**
 * 吃仙豆或营养液 （消耗背包物品）
 * User: liyuluan
 * Date: 13-11-21
 * Time: 下午4:36
 */

var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");
var itemModel = require("../model/item");
var user = require("../model/user");
var redis = require("../alien/db/redis");
var async = require("async");
var activityConfig = require("../model/activityConfig");
var userVariable = require("../model/userVariable");

function start(postData, response, query) {
    if (jutil.postCheck(postData,"itemId") == false) {
        response.echo("item.eat", jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var itemId = postData["itemId"];
    var itemCount = postData["itemCount"] ? postData["itemCount"] - 0 : 1;
    var configData = configManager.createConfig(userUid);
    var itemConfig = configData.getConfig("item")[itemId];
    var nowDate = new Date(jutil.now() * 1000);
    var itemUseTimesKey = nowDate.getFullYear()+""+(nowDate.getMonth()+1)+""+nowDate.getDate()+":itemUseTimes:"+itemId;
    var itemData = null;//道具数据
    var userData = null;//用户数据
    var resultUserData = null;
    var resultItemData = null;
    var multiplesConfig = {};
    async.series([
        function(cb) { //取用户数据
            user.getUser(userUid, function(err,res) {
                if (err || res == null) cb("dbError");
                else {
                    userData = res;
                    cb(null);
                }
            });
        },
        function(cb){//验证道具使用次数
            var vip = userData["vip"] - 0;
            if (itemCount > itemConfig["dailyUseTime"][vip] - 0 && itemConfig["dailyUseTime"][vip] - 0 != 0) {
                cb("noEnoughItemUseTimes");
            } else {
                if (itemConfig["dailyUseTime"][vip] != undefined && (itemConfig["dailyUseTime"][vip] - 0) > 0) {
                    redis.user(userUid).s(itemUseTimesKey).get(function (err, res) {
                        if (err) {
                            cb("dbError");
                        } else if (res == null) {
                            cb(null);
                        } else {
                            if (res <= itemConfig["dailyUseTime"][vip] - 0 - itemCount || itemConfig["dailyUseTime"][vip] - 0 == 0) {
                                cb(null);
                            } else {
                                cb("noEnoughItemUseTimes");//使用次数不足
                            }
                        }
                    });
                } else {
                    cb(null);
                }
            }
        },
        function(cb){ //获取N倍活动配置
            activityConfig.getConfig(userUid, "eatBeanNormal", function(err, res) {
                var configArray = res;
                if (configArray[0] == false) {
                    cb(null); //当前没有活动， 取默认
                } else {
                    multiplesConfig = configArray[2] || {}; //如果报错，取默认为1的项
                    cb(null);
                }
            });
         },
        function(cb) { //取数据库道具数量
            itemModel.getItem(userUid, itemId ,function(err,res) {
                if (err) cb("dbError");
                else if (res == null || res["number"] < itemCount) cb("noItem"); //没有数量
                else {
                    itemData = res;
                    cb(null);
                }
            });
        },
        function(cb) { //pvePower	lastRecoverPvePower
            var addM = multiplesConfig[itemConfig["itemType"]] != null ? (multiplesConfig[itemConfig["itemType"]] - 0) : 1;
            var addValue = (itemConfig["typeValue"] - 0) * addM; //增加的值
            var mNow = jutil.now();
            var addMax = 0;
            async.timesSeries(itemCount, function (n, next) {
                switch (itemConfig["itemType"]) {
                    case 10:
                        var pvePower = userData["pvePower"] - 0;
                        var lastRecoverPvePower = userData["lastRecoverPvePower"] - 0;
                        var resultData = configData.getPvePower(pvePower, lastRecoverPvePower, mNow);
                        var updateData = {};
                        updateData["pvePower"] = resultData[0] + addValue;
                        updateData["lastRecoverPvePower"] = resultData[1];
                        user.updateUser(userUid, updateData, function (err, res) {
                            if (err) next("dbError");
                            else {
                                resultUserData = updateData;
                                userData["pvePower"] = updateData["pvePower"];
                                userData["lastRecoverPvePower"] = updateData["lastRecoverPvePower"];
                                next(null);
                            }
                        });
                        break;
                    case 11:
                        var pvpPower = userData["pvpPower"] - 0;
                        var lastRecoverPvpPower = userData["lastRecoverPvpPower"] - 0;
                        if(userData["monthCard"] == "fifty"){
                            addMax = 18;
                        }else{
                            addMax = 0;
                        }
                        var resultData = configData.getPvpPower(pvpPower, lastRecoverPvpPower, mNow, addMax);
                        var updateData = {};
                        updateData["pvpPower"] = resultData[0] + addValue;
                        updateData["lastRecoverPvpPower"] = resultData[1];
                        user.updateUser(userUid, updateData, function (err, res) {
                            if (err) next("dbError");
                            else {
                                resultUserData = updateData;
                                userData["pvpPower"] = updateData["pvpPower"];
                                userData["lastRecoverPvpPower"] = updateData["lastRecoverPvpPower"];
                                next(null);
                            }
                        });
                        break;
                    case 31:
                        break;
                    case 50:
                        userVariable.getVariable(userUid, "gravityCharge", function (err, res) {
                            if (err) next(err);
                            else {
                                if (err) next("dbError");
                                else {
                                    if(res == null){
                                        var newValue = addValue;
                                    }else{
                                        var newValue = addValue + parseInt(res);
                                    }
                                    resultUserData = {"charge": newValue};
                                    userVariable.setVariable(userUid, "gravityCharge", newValue, next);
                                }
                            }
                        });
                        break;
                    default :
                        next("typeError");
                        break;
                }
            }, function (err, res) {
                cb(err);
            });
        },
        function(cb) { //减掉道具
            itemModel.updateItem(userUid, itemId, -1 * itemCount, function (err, res) {
                resultItemData = res;
                cb(null);
                if (err) console.error("item.eat", userUid, itemId, err.stack);
            });
        },
        function(cb) { //更新道具使用次数
            redis.user(userUid).s(itemUseTimesKey).incrby(itemCount, cb);
        }
    ],function(err) {
        if (err) response.echo("item.eat", jutil.errorInfo(err));
        else {
            response.echo("item.eat", {"userData":resultUserData,"itemData":resultItemData});
        }
    });
}



exports.start = start;