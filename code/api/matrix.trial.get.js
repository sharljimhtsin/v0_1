/**
 * Created with JetBrains WebStorm.
 * 赛亚人图阵api--matrix.trial 寻阵试炼模块
 * User: za
 * Date: 16-4-8
 * Time: 下午19:51(预计三周)
 * To change this template use File | Settings | File Templates.
 */

var user = require("../model/user");
var jutil = require("../utils/jutil");
var async = require("async");
var mat = require("../model/matrix");
var modelUtil = require("../model/modelUtil");
var configManager = require("../config/configManager");

function start(postData, response, query) {
    var userUid = query["userUid"];
    var currentConfig;
    var returnData = {};
    var userData = {};
    var trialData = {};
    var userVip = 0;
    var configData = configManager.createConfig(userUid);
    var matConfig = configData.getConfig("pictureFormation");
    var freshTimes = 0;
    var timesByVip = 0;
    var vipList = matConfig["vip"];
    var freshPay = 0;
    //展示：阵图值，已激活阵图，灵石
    async.series([function(cb){
        user.getUser(userUid,function(err,res){
            if(err)cb(err);
            else{
                userVip = res["vip"]-0;
                timesByVip = vipList[userVip]-0;
                cb(null);
            }
        });
    },function(cb){
        mat.getUserData(userUid,function(err,res){
            if(err)cb(err);
            else{
                if(res["arg"]["trial"]["freshTimes"] == undefined){
                    userData = res["arg"];
                    freshTimes = matConfig["freeTime"]-0;
                    freshPay = matConfig["refreshCost"]-0;
                    returnData["trialTypeList"] = vipList;
                    trialData = {"freshTimes":freshTimes,"freshPay":freshPay,"timesByVip":timesByVip,"type":""};
                    userData["trial"] = trialData;
                    returnData = trialData;
                    cb(null);
                }else{
                    userData = res["arg"];
                    returnData = userData["trial"];
                    cb(null);
                }
            }
        });
    },function(cb){
        mat.setUserData(userUid,userData,cb);
    }],function(err,res){
        if(err){
            response.echo("matrix.trial.get", jutil.errorInfo(err));
        } else{
            response.echo("matrix.trial.get",returnData);
        }
    });
}

exports.start = start;