/**
 * user.moreinfo 某个取用户扩展信息
 * User: joseppe
 * Date: 14-11-14
 * Time: 下午14:48
 */


var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var login = require("../model/login");
var bitUtil = require("../alien/db/bitUtil");
var configManager = require("../config/configManager");
var pvptop = require("../model/pvptop");
var async = require("async");
var user = require("../model/user");
//var moment = require("moment");
var userVariable = require("../model/userVariable");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userView"], query["country"]) == false) {
        response.echo("user.moreInfo", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid") == false) {
        response.echo("user.moreInfo", jutil.errorInfo("postError"));
        return;
    }
    admin.addOneOperationLog("userInfo",query,postData);
    var userUid = postData["userUid"];

    var configData = configManager.createConfig(userUid);
    //获取激战积分并同步
    var data = [];
    var needRedeemPoint = false;
    var userData = {};//获取体力和精力并同步
    var addMax = 0;
    async.series([
        function(cb){
            user.getUser(userUid, function(err, res){
                userData = res;
                cb(null);
            })
        },
        function(cb){
            admin.getVariableTime(userUid, function(err, res) {
                for(var i in res){
                    if(res[i]["name"] == "redeemPoint"){
                        needRedeemPoint = true;
                    }
                    res[i]["table"] = "variable";
                    data.push(res[i]);
                }
                cb(null);
            });
        },
        function(cb){
            if(needRedeemPoint){
                pvptop.getCurrentPoint(userUid, function(err, res){
                    for(var i in data){
                        if(data[i]["name"] == "redeemPoint"){
                            data[i]["value"] = res["value"];
                            data[i]["time"] = res["time"];
                        }
                    }
                    cb(null);
                });
            } else {
                cb(null);
            }
        },
        function(cb){//同步体力和精力
            var newPvePower = configData.getPvePower(userData["pvePower"] - 0, userData["lastRecoverPvePower"] - 0, jutil.now());
            userData["pvePower"] = newPvePower[0];
            userData["lastRecoverPvePower"] = newPvePower[1];
            if(userData["monthCard"] == "fifty"){
                addMax = 18;
            }else{
                addMax = 0;
            }
            var newPvpPower = configData.getPvpPower(userData["pvpPower"] - 0, userData["lastRecoverPvpPower"] - 0, jutil.now(), addMax);
            userData["pvpPower"] = newPvpPower[0];
            userData["lastRecoverPvpPower"] = newPvpPower[1];
            cb(null)
        },
        function(cb){
            for(var i in userData){
                data.push({"name":i,"time":0,"value":userData[i], "table":"user"});
            }
            cb(null);
        },
        function(cb){
            for(var i in data){
                if(des.hasOwnProperty(data[i]["name"]))
                    data[i]["des"] = des[data[i]["name"]];
                else
                    data[i]["des"] = data[i]["name"];
                data[i]["time"] = jutil.formatTime("Y-m-d H:i:s", data[i]["time"]);
            }
            cb(null);
        }
    ], function(err){
        if(err){
            response.echo("user.moreInfo", jutil.errorInfo(err));
        } else {
            response.echo("user.moreInfo", data);
        }
    });
}

var des = {
    "userSysLanguage":"使用语言",
    "redeemPoint":"激战积分",
    "totalCharge":"充值总额",
    "isFirstCharge":"是否首冲",
    "pvePower":"体力",
    "pvpPower":"精力",
    "gravityCharge":"元气",
    "petTimes":"神龙培养次数",
    "leagueUid":"联盟ID",
    "leagueStarReward":"联盟星球奖励"
};
exports.start = admin.adminAPIProxy(start);