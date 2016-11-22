/**
 * 碎片兑换(patch)
 * 获取兑换的装备，用户拥有碎片数据接口（接收参数：装备ID）
 * User: peter.wang
 * Date: 14-09-05
 * Time: 下午17:00
 */
var async = require("async");
var configManager = require("../config/configManager");
var activityData = require("../model/activityData");
var activityConfig = require("../model/activityConfig");
var jutil = require("../utils/jutil");
var item = require("../model/item");

//var postData = {'equipmentId':124001};
function start(postData, response, query) {
    var PATCH_ACTIVITY_KEY = activityData.PATCH_COMPOSE;
    var PATCH_ACTIVITY_NAME = "patchCompose";

    if (jutil.postCheck(postData, "equipmentId") == false) {
        response.echo("equipment.compose", jutil.errorInfo("postError"));
        return;
    }

    var userUid = query["userUid"];
    var postEquipmentId = postData["equipmentId"];

    var activityMaterial = {};

    var returnMaterial = {};
    var returnWanneng = {};
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

                    if(activityMaterial["content"]==undefined || activityMaterial["content"][postEquipmentId]==undefined){
                        cb("postError");
                    }else{
                        cb(null);
                    }
                }
            });
        },
        function (cb) {
            item.getItems(userUid,function(err,res){
                if(err){
                    cb(err,null);
                }else{

                    var activityMaterialFor = activityMaterial["content"][postEquipmentId];
                    for(var id in activityMaterialFor){
                        if(res[id]==undefined){
                            returnMaterial[id] = {"need":activityMaterialFor[id],"have":0};
                        }else{
                            returnMaterial[id] = {"need":activityMaterialFor[id],"have":res[id]["number"]};
                        }
                    }

                    // 万能碎片
                    if(res["153001"] == undefined){
                        returnWanneng["153001"] = {"have":0};
                    }else{
                        returnWanneng["153001"] = {"have":res["153001"]["number"]};
                    }

                    cb(null);
                }
            });
        }],
        function (err, res){
            if (err) {
                response.echo("patch.compose.equipmentinfo", jutil.errorInfo(err));
            } else {
                response.echo("patch.compose.equipmentinfo",{"material":returnMaterial,"wanneng":returnWanneng,"activityMaterial":activityMaterial});
            }
        }
    );
}

exports.start = start;