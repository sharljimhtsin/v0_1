/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 13-11-1
 * Time: 下午6:01
 * To change this template use File | Settings | File Templates.
 */
var jutil = require("../utils/jutil");
var map = require("../model/map");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var user = require("../model/user");
var async = require("async");

function start(postData, response, query){
    if (jutil.postCheck(postData,"mapId") == false) {
        response.echo("eatingFairyBeans",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var mapId = "" + postData["mapId"];
    var configData = configManager.createConfig(userUid);
    var mapConfig = configData.getConfig("map");
    var mapConfigItem = mapConfig[mapId];
    var userObj = {};
    var returnData = {};
    var bigMapConfig = configData.getConfig("bigMap");
    var childArr = null;
    for(var key in bigMapConfig){
        var item = bigMapConfig[key];
        var child = item["child"];
        if(child.indexOf(mapId) != -1){
            childArr = child;
            break;
        }
    }
    if (childArr == null) {
        response.echo("eatingFairyBeans",jutil.errorInfo("postError"));
        return;
    }
    async.auto({
        "judgeStar":function(cb){
            map.judgeAllMapThreeStar(userUid,childArr,function(err,res){
                if(err){
                    cb(err,null);
                }else{
                    cb(null,null);
                }
            });
        },
        "judgeHasNotEat":function(cb){
            map.getMapItem(userUid,mapId,function(err,res){
                if(err){
                    cb(err,null);
                }else{
                    if(mapConfigItem["nextMapId"] != ""){
                        cb("eatBeansWrong",null);
                    }else if(res["clearance"] != 0){
                        cb("beansHasEat",null);
                    }else
                    {
                        cb(null,null);
                    }
                }
            });
        },
        "getUserData":function(cb){
            user.getUser(userUid,function(err,res){
                if(err || res == null){
                    cb("noThisUser",null);
                }else{
                    userObj = res;
                    cb(null,null);
                }
            })
        },
        "updateUser":["judgeStar","judgeHasNotEat","getUserData",function(cb){
            var updateItem = {};
            var mapConfig = configData.getConfig("main");
            var pvePower = userObj["pvePower"] - 0;
            var lastRecoverPvePower = userObj["lastRecoverPvePower"] - 0;
            var newPvePowerData = configData.getPvePower(pvePower,lastRecoverPvePower,jutil.now());
            var addPvePower = mapConfig["allFullStarReward"] - 0;
            updateItem["pvePower"] = newPvePowerData[0] + addPvePower;
            updateItem["lastRecoverPvePower"] = newPvePowerData[1];
            user.updateUser(userUid,updateItem,function(err,res){
                if(err){
                    cb(err,null);
                }else{
                    returnData["updateUser"] = updateItem;
                    cb(null,null);
                }
            })
        }],
        "updateMap":["updateUser",function(cb){
            var item = {};
            item["clearance"] = 1;
            item["mapId"] = mapId;
            map.updateMap(userUid,mapId,item,function(err,res){
                if(err){
                    cb(err,null);
                }else{
                    returnData["mapItem"] = item;
                    cb(null,null);
                }
            });
        }]
    },function(err,res){
        if(err){
            response.echo("eatingFairyBeans",jutil.errorInfo(err));
        }else{
            response.echo("eatingFairyBeans",returnData);
        }
    });
}
exports.start = start;