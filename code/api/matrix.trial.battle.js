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
function start(postData, response, query) {
    if (jutil.postCheck(postData, "type") == false) {
        echo("postError");
        return false;
    }
    var userUid = query["userUid"];
    var type = postData["type"];//类似巡游活动
    var currentConfig;
    var returnData = {};
    var timesByVip = 0;
    var rewardData = [];
    var list = {};
        async.series([function(cb){
            mat.getConfig(userUid,function(err,res){
                if(err)cb(err);
                else{
                    currentConfig = res[2];
                    cb(null);
                }
            });
        },function(cb){
            mat.getUserData(userUid,function(err,res){
                if(err)cb(err);
                else{
                    list = res["arg"];
                    timesByVip = list["trial"]["timesByVip"]-0;
                    if(timesByVip - 1 <0){
                        cb("challengingTimesNotEnough");//挑战次数不足
                    }else{
                        timesByVip--;
                        cb(null);
                    }
                }
            });
        },function(cb){
            mat.battle(userUid, type, function (err, res) {
                if (err)cb(err);
                else {
                    returnData["battleData"] = res;
                    returnData["userData"] = list;
                    if (res["isWin"] == true) {
                        rewardData = res["reward"];
                        cb(null);
                    }else{
                        rewardData = [];
                        cb(null);
                    }
                }
            });
        },function(cb){
            returnData["rewardList"] = [];
            async.eachSeries(rewardData, function (reward, esCb) {
                modelUtil.addDropItemToDB(reward["id"], reward["count"], userUid, false, 1, function (err, res) {
                    if (err) {
                        esCb(err);
                        console.error(reward["id"], reward["count"], reward["isPatch"], reward["level"], err.stack);
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
    }],function(err,res){
        if(err){
            response.echo("matrix.trial.battle", jutil.errorInfo(err));
        } else{
            response.echo("matrix.trial.battle",returnData);
        }
    });
}
exports.start = start;