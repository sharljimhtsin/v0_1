/**
 * Created with JetBrains WebStorm.
 * 赛亚人图阵api--matrix.saiya.bag 赛亚人图阵模块(背包)--阵图激活
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
    if (jutil.postCheck(postData, "index") == false) {
        echo("postError");
        return false;
    }
    var userUid = query["userUid"];
    var index = postData["index"];
    var currentConfig;
    var returnData = {};
    var limitActivateTrial;
    var nowTrial = 0;//当前已激活阵图的个数
    var nextIndex = 0;//下一章节的标签
    var list = {};
    //展示：阵图值，已激活阵图，灵石
        async.series([function(cb){
            mat.getConfig(userUid,function(err,res){
                if(err)cb(err);
                else{
                    currentConfig = res[2];
                    limitActivateTrial = currentConfig["bag"][index]["limitActivateTrial"]-0;
                    cb(null);
                }
            });
        },function(cb){
            mat.getUserData(userUid,function(err,res){
                if(err)cb(err);
                else{
                    list = res;
                    nowTrial = list["bag"][index]["nowTrial"]-0;
                    cb(null);
                }
            });
        },function(cb){
            if(nowTrial >= limitActivateTrial){
                nextIndex = index++;
                list["bag"][nextIndex]["nowTrial"] = limitActivateTrial - nowTrial;
                list["bag"][nextIndex]["status"] = 1;
                cb(null);
            }else{
                cb(null);
            }
        },function(cb){//hero表
            returnData["crystal"] = list["bag"]["crystal"];//灵石结晶
            returnData["trialValue"] = list["bag"]["trialValue"];//阵图值
            returnData["activateTrial"] = list["bag"]["activateTrial"];//已激活阵图个数
            cb(null);
    }],function(err,res){
        if(err){
            response.echo("matrix.bag", jutil.errorInfo(err));
        } else{
            response.echo("matrix.bag",list);
        }
    });
}
exports.start = start;