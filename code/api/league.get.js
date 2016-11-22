/**
 * Created with JetBrains WebStorm.
 * User: kongyajie
 * Date: 14-6-23
 * Time: 下午7:44
 * To change this template use File | Settings | File Templates.
 */
var user = require("../model/user");
var jutil = require("../utils/jutil");
var async = require("async");
var userVariable = require("../model/userVariable");
var configManager = require("../config/configManager");

/**
 * 返回玩家的联盟uid
 * @param postData
 * @param response  {"leagueUid"}
 * @param query
 */

function start(postData, response, query) {
    var userUid = query["userUid"];
    var returnData = {"petTimes":0};
    var configData = configManager.createConfig(userUid);
    var dragonConfig = configData.getConfig("starCraft");
    var startTime = jutil.monday() + dragonConfig["startWeektime"];

    if(jutil.now() < startTime)
        startTime -= 604800;
    var rewardStart = startTime+dragonConfig["doTime"]["rewardStart"]
    if(jutil.now() < rewardStart)
        rewardStart -= 604800;

    async.series([function(cb){
        user.getUser(userUid,function(err,res){
            if(err) cb(err);
            else{
                returnData["leagueUid"] = res["leagueUid"];
                cb(null);
            }
        });
    }, function(cb) {
        userVariable.getVariableTime(userUid, "petTimes", function (err, res) {
            if (err) {
                cb(err);
            } else if(res != null && jutil.compTimeDay(jutil.now(), res["time"])){
                returnData["petTimes"] = res["value"]-0;
                cb(null);
            } else {
                returnData["petTimes"] = 0;
                cb(null);
            }
        });
    }, function(cb) {
        userVariable.getVariable(userUid, "leagueStarReward", function(err, res) {
            returnData["leagueStarReward"] = 1;
            if (!err && res != null){
                returnData["leagueStarReward"] = (res - rewardStart >= 0?0:1);
            }
            cb(err, res);
        });
    }],function(err){
        if(err){
            response.echo("league.get",jutil.errorInfo(err));
        }else{
            response.echo("league.get", returnData);
        }
    });
}

exports.start = start;