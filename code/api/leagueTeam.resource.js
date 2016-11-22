/**
 * Created with JetBrains WebStorm.
 * User: za
 * Date: 16-06-22
 * Time: 下午14:52
 * 联盟战 资源塔获取资源
 */

var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");
var userVariable = require("../model/userVariable");
var configManager = require("../config/configManager");
var league = require("../model/league");
var leagueTeam = require("../model/leagueTeam");
var modelUtil = require("../model/modelUtil");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "type") == false) {
        echo("postError");
        return false;
    }
    var userUid = query["userUid"];
    var sTime = 0;
    var returnData = {};
    var currentConfig;
    var leagueUid = "";
    var top = 0;
    async.series([function(cb){//验证是否加入联盟
        user.getUser(userUid,function(err,res){
            if(err)cb(err);
            else{
                if(res == null ||res["leagueUid"] == 0){
                    cb("noLeague");
                }else{
                    leagueUid = res["leagueUid"];
                    cb(null);
                }
            }
        });
    },function(cb){
        leagueTeam.getConfig(userUid,function(err,res){
            if(err)cb(err);
            else{
                if(res != null){
                    sTime = res[0];
                    if(sTime + 86400 * 2 + 43200 > jutil.now()){
                        cb("timeNotMatch");
                    }else{
                        currentConfig = res[2];
                        cb();
                    }
                }else{
                    cb("configError");
                }
            }
        });
    },function(cb){
        leagueTeam.getUserData(userUid,sTime,function(err,res){
            if(err)cb(err);
            else{
                if(res != null && res["statusTime"] != undefined){
                    if(res["statusTime"] + 600 <= jutil.now()){//每隔10分钟产出资源--积分
                        returnData["reward"] = currentConfig["resourceReward"];
                        cb();
                    }else{
                        cb("timeNotMatch");
                    }
                }else{
                    cb("dbError");
                }
            }
        });
    },function(cb){
        leagueTeam.add(userUid,leagueUid,cb);
    },function (cb) {//进背包
        returnData["rewardList"] = [];
        async.eachSeries(returnData["reward"], function (reward, esCb) {
            modelUtil.addDropItemToDB(reward["id"], reward["count"], userUid, false, 1, function (err, res) {
                if (err) {
                    esCb(err);
                    console.error(reward["id"], reward["count"], err.stack);
                } else {
                    if (res instanceof Array) {
                        for (var i in res) {
                            returnData["rewardList"].push(res[i]);
                        }
                    } else {
                        returnData["rewardList"].push(res);
                    }
                    esCb(null);
                }
            });
        }, cb);
    }],function(err){
        if (err) {
            response.echo("leagueTeam.resource", jutil.errorInfo(err));
        } else {
            response.echo("leagueTeam.resource", returnData);
        }
    });
}

exports.start = start;