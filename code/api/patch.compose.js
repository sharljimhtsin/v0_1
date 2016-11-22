/**
 * 碎片兑换(patch)
 * 1)获取可以合成的装备列表
 *   读取配制
 * 2)获取兑换的装备，用户拥有碎片数据接口（接收参数：装备ID）
 *   patch.compose.equipmentinfo
 * 3)合成碎片接口（接收参数：合成的装备ID,使用碎片ID及数量，及万能碎片ID及数量）
 *   patch.compose
 * User: peter.wang
 * Date: 14-09-05
 * Time: 上午11:00
 */


var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");
var activityData = require("../model/activityData");
var activityConfig = require("../model/activityConfig");
var async = require("async");
var equipment = require("../model/equipment");
var item = require("../../code/model/item");
var user = require("../../code/model/user");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");

//var postData = {"equipUid":124001,'material':[{"id":152905,"need":30},{"id":152906,"need":60},{"id":152907,"need":80},{"id":152908,"need":100},{"id":153001,"need":0}]};
/*
 * {"maxUniversalPatch":0.5,"content":{"134013":{"152901":120,"152902":120,"152903":120,"152904":120},"134016":{"152901":120,"152902":120,"152903":120,"152904":120},"144021":{"152901":60,"152902":60,"152903":120,"152904":120},"123005":{"152901":30,"152902":30,"152903":30,"152904":30},"133001":{"152901":30,"152902":30,"152903":30,"152904":30},"143003":{"152901":40,"152902":40,"152903":40,"152904":40},"144001":{"152901":200,"152902":200,"152903":200,"152904":200}}}
 * */
function start(postData, response, query) {
    var PATCH_ACTIVITY_KEY = activityData.PATCH_COMPOSE;
    var PATCH_ACTIVITY_NAME = "patchCompose";

    if (jutil.postCheck(postData, "equipUid", "material") == false) {
        response.echo("patch.compose", jutil.errorInfo("postError"));
        return;
    }

    var userUid = query["userUid"];
    var equipUid = postData["equipUid"];
    var postMaterial = postData["material"];
    var patchEquipment = {};
    var patchItem = [];

    var material = [];          // post数据
    var activityMaterial = {};  // 合法检测

    if ((postMaterial instanceof Array == false)) {
        response.echo("patch.compose", jutil.errorInfo("postError"));
        return;
    }

    async.series([
        function (cb) {
            activityConfig.getConfig(userUid, PATCH_ACTIVITY_NAME, function(err, res){
                if (err || res == null) cb("CannotGetConfig");
                else {
                    if (res[0]) {// 活动期

                        var activityArg = parseInt(res[1]);
                        if (isNaN(activityArg)) activityArg = 0;
                        if (activityArg == -1) {
                            // 取数据库配置，如果配置不存在取默认配置
                            activityMaterial =  res[2] || res[3];
                        } else {
                            // 取指定配置，如果配置不存在取默认配置
                            activityMaterial =  res[3];
                        }

                    } else {// 活动结束
                        activityMaterial = res[3];
                    }

                    if(activityMaterial["content"]==undefined || activityMaterial["content"][equipUid]==undefined){
                        cb("postError");
                    }else{
                        //{ '152901': 50, '152902': 30, '152903': 30, '152904': 30 }
                        var serverMaterial = jutil.deepCopy(activityMaterial["content"][equipUid]);
                        var isValid = true;
                        out:for (var a in serverMaterial) {
                            var isOk = false;
                            /*[ { id: '152901', need: 40 },
                             { id: '152902', need: 30 },
                             { id: '152903', need: 30 },
                             { id: '152904', need: 30 },
                             { id: '153001', need: 10 } ]*/
                            var patchAny = 0;
                            var patchNeed = 0;
                            var patchOwn = 0;
                            for (var b in postMaterial) {
                                b = postMaterial[b];
                                if (a == b["id"]) {
                                    patchNeed = serverMaterial[a] - 0;
                                    patchOwn = b["need"] - 0;
                                }
                                if (b["id"] == "153001") {
                                    patchAny = b["need"] - 0;
                                }
                            }
                            if (patchNeed <= patchOwn + patchAny) {
                                isOk = true;
                            }
                            if (isOk == false) {
                                isValid = false;
                                cb("postError");
                                break out;
                            }
                        }
                        if (isValid) {
                            cb();
                        }
                    }
                }
            });
        },
        function (cb) {
            var checkarr = [];
            for (var i = 0; i < postMaterial.length; i++) { //排除相同的碎片
                var mItem = postMaterial[i];
                if (checkarr.indexOf(mItem["id"]) == -1) {
                    material.push(mItem);
                    checkarr.push(mItem["id"]);
                }
            }
            if (material.length == 0) {
                cb("postError");
            } else {
                cb(null);
            }
        },
        function (cb) { // 检测用户拥有碎片是否充足
            item.getItems(userUid,function(err,res){
                if(err){
                    cb(err,null);
                }else{
                    var postNeed = 0;
                    for(var id in material){
                        var itemid = material[id]["id"];
                        var need = material[id]["need"];
                        if(need>0){
                            if(res[itemid]==undefined){
                                cb("noItem",null);
                                return;
                            }else if(need>res[itemid]["number"]){
                                cb("noItem",null);
                                return;
                            }
                        }
                        postNeed += need - 0;
                    }

                    var configNeed = 0;
                    var activityMaterialFor = activityMaterial["content"][equipUid];
                    for(var id in activityMaterialFor){
                        configNeed += activityMaterialFor[id] -0;
                    }

                    if(configNeed == postNeed)  cb(null,null);
                    else cb("postError",null);
                }
            });
        },
        function (cb) { // 减去用于合成的碎片
            async.forEachSeries(material, function(itm, callback) {
                if (itm["need"] > 0) {
                    item.updateItem(userUid, itm["id"], 0-itm["need"], function (err, res) {
                        mongoStats.expendStats( itm["id"], userUid, "127.0.0.1", null, mongoStats.E_PATCH_COMPOSE, 1);
                        patchItem.push(res);
                        callback(err, null);
                    });
//                    setTimeout(item.updateItem(userUid, itm["id"], 0-itm["need"], function (err, res) {
//                        callback(err, null);
//                    }), itm.delay);
                }else{
                    callback(null, null);
                }
            }, function(err) {
                if (err) cb(err, null);
                else cb(null, null);
            });
//            async.forEach(material, function (itm, callback) {
//                item.updateItem(userUid, itm["id"], 0-itm["need"], function (err, res) {
//                    if (itm["need"] > 0) {
//                        callback(null, null);
//                    }else{
//                        callback(null, null);
//                    }
//                });
//            }, function (err) {
//                if (err) cb(err, null);
//                else cb(null, null);
//            });
        },
        function (cb){ // 添加合成的装备
            mongoStats.dropStats(equipUid, userUid, '127.0.0.1', null, mongoStats.PATCH_COMPOSE, 1);
            stats.dropStats(equipUid, userUid, "127.0.0.1", null, mongoStats.patchCompose, 1);
            equipment.addEquipment(userUid, equipUid, 1, function (err, res) {
                if(err) cb(err,null);
                else {
                    patchEquipment = res;
                    cb(null,null);}
            });
        }
    ], function (err, res) {
        if (err) {
            response.echo("patch.compose", jutil.errorInfo(err));
        } else {
            response.echo("patch.compose",{"equipUid":equipUid,"patchEquipment":patchEquipment,"patchItem":patchItem});
        }
    });

}


exports.start = start;