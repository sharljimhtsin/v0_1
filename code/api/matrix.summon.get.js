/**
 * Created with JetBrains WebStorm.
 * 赛亚人图阵api--matrix.summon 召唤图阵模块（类似随机箱子）
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
    var userUid = query["userUid"];
    var currentConfig;
    var userData = {};
    var summData = {};
    var returnData = {};
    var summonTimes = 0;
    //展示：阵图值，已激活阵图，灵石
    async.series([function(cb){
        mat.getConfig(userUid,function(err,res){
            if(err)cb(err);
            else{
                currentConfig = res[2];
                summonTimes = currentConfig["summonFreeTimes"]-0;
                cb(null);
            }
        });
    },function(cb){
        mat.getUserData(userUid,function(err,res){
            if(err)cb(err);
            else{
                userData = res["arg"];
                if(userData["summon"]["summonTimes"] == undefined){
                    summData = {"summonTimes":summonTimes,"reward":[]};
                    userData["summon"] = summData;
                    returnData = userData["summon"];
                    mat.setUserData(userUid,userData,cb);
                }else{
                    returnData = userData["summon"];
                    cb(null);
                }
            }
        });
    }],function(err,res){
        if(err){
            response.echo("matrix.summon.get", jutil.errorInfo(err));
        } else{
            response.echo("matrix.summon.get",returnData);
        }
    });
}
exports.start = start;