/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-2-14
 * Time: 下午3:35
 * To change this template use File | Settings | File Templates.
 */
var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");
var debris = require("../model/debris");
var configManager = require("../config/configManager");
function start(postData, response, query){
//    if (jutil.postCheck(postData,"skillId") == false) {
//        response.echo("dragon.sell",jutil.errorInfo("postError"));
//        return;
//    }
    var userUid = query["userUid"];
    var skillId = postData["skillId"];
    var userData;
    var debrisItem;
    var moneyGet = 0;
    var returnData = {};


    async.auto({
        "getUserData":function(cb){//获取用户数据
            user.getUser(userUid,function(err,res){
                if(err || res == null){
                    cb("noThisUser",null);
                }else{
                    userData = res;
                    cb(null,null);
                }
            });
        },
        "getDebrisData":function(cb){//获取残章数据
            debris.getDebrisItem(userUid,skillId,function(err,res){
                if(err || res == null){
                    cb("noThisChapter",null);
                }else{
                    debrisItem = res;
                    cb(null,null);
                }
            });
        },
        "calculateMoney":["getUserData","getDebrisData",function(cb){
            var mainConfig = configManager.createConfig(userUid).getConfig("main");
            var skillIConfig = configManager.createConfig(userUid).getConfig("skill");
            var skillPatchSaleCost = mainConfig["skillPatchSaleCost"];
            var star = skillIConfig[skillId]["star"];
            var costItem = skillPatchSaleCost["" + star];
            var cost = costItem["cost"];
            var count = 0;
            count += debrisItem["type1"];
            count += debrisItem["type2"];
            count += debrisItem["type3"];
            count += debrisItem["type4"];
            count += debrisItem["type5"];
            count += debrisItem["type6"];
            moneyGet = (count + 1) * cost;
            cb(null,null);
        }],
        "updateUser":["calculateMoney",function(cb){
            var updateUser = {};
            updateUser["gold"] = userData["gold"] * 1 + moneyGet;
            user.updateUser(userUid,updateUser,function(err,res){
                if(err || res == null){
                    cb("sellThisChapterFail",null);
                }else{
                    returnData["updateUser"] = updateUser;
                    cb(null,null);
                }
            });
        }],
        "updateDebris":["updateUser",function(cb){
            debris.removeSkillPatch(userUid,skillId,function(err,res){
                if(err){
                    cb(err,null);
                }else{
                    cb(null,null);
                }
            });
        }]
    },function(err,res){
        if(err){
            response.echo("dragon.sell",jutil.errorInfo(err));
        }else{
            response.echo("dragon.sell",returnData);
        }
    });
}
exports.start = start;