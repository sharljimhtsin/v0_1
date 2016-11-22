/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-3-27
 * Time: 上午11:43
 * To change this template use File | Settings | File Templates.
 */
var jutil = require("../utils/jutil");
var async = require("async");
var userVariable = require("../model/userVariable");
var configManager = require("../config/configManager");
function getActiveMapData (userUid,callBack){
    var activeMapConfig = configManager.createConfig(userUid).getConfig("activityMap");
    var requestArr = [];
    var returnData = {};
    for (var key in activeMapConfig){
        var item = activeMapConfig[key];
        var writeKey = item["type"] + "_" + item["level"];
        requestArr.push(writeKey);
    }
    async.forEach(requestArr,function (item,forCb){
        userVariable.getVariableTime(userUid,item,function(err,res){
            if(err) forCb(err,res);
            else{
                if(res == null) returnData[item] = 0;
                else{
                    var time = res["time"];
                    var value =res["value"];
                    var isThisDay = jutil.compTimeDay(time,jutil.now());
                    if(isThisDay == true){
                        returnData[item] = res["value"];
                    }else{
                        returnData[item] = 0;
                    }
                }
                forCb(null,null);
            }
        });
    },function (err,res){
        if(err != null){
            callBack(err,null);
        }else{
            callBack(null,returnData);
        }
    })
}
exports.getActiveMapData = getActiveMapData;