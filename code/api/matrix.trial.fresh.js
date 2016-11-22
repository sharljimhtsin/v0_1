/**
 * Created with JetBrains WebStorm.
 * 赛亚人图阵api--matrix.trial 寻阵试炼模块-刷新
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
    var returnData = {};
    var freshTimes = 0;
    var freshPay = 0;
    var trialData = {};
    var myIngot = 0;
    var trialTypeList = [];
    var list = {};
    var type = "";
        async.series([function(cb){
            mat.getConfig(userUid,function(err,res){
                if(err)cb(err);
                else{
                    currentConfig = res[2];
                    trialTypeList = currentConfig["trialTypeList"];
                    cb(null);
                }
            });
        },function(cb){//验证用户金币数
            user.getUser(userUid, function (err, res) {
                if (err)cb(err);
                else{
                    myIngot = res["ingot"]-0;
                    cb(null);
                }
            });
        },function(cb){
            mat.getUserData(userUid,function(err,res){//验证刷新次数
                if(err)cb(err);
                else{
                    list = res["arg"];
                    trialData = list["trial"];
                    returnData["userData"] = trialData;
                    freshPay = trialData["freshPay"]-0;
                    //随机出一个map
                    var key = Math.floor(Math.random() * trialTypeList.length);
                    type = trialTypeList[key];
                    trialData["type"] = type;
                    returnData["type"] = trialData["type"];
                    freshTimes = trialData["freshTimes"]-0;
                    cb(null);
                }
            });
        },function(cb){//验证刷新次数
            if(freshTimes <= 0){//次数不够扣金币
                if(myIngot - freshPay < 0){
                    cb("ingotNotEnough");
                }else{
                    returnData["userIngot"] = myIngot - freshPay;
                    returnData["freshTimes"] = 0;
                    user.updateUser(userUid,{"ingot":returnData["userIngot"]},cb);
                }
            }else{
                freshTimes--;
                returnData["userIngot"] = myIngot;
                returnData["freshTimes"] = freshTimes;
                cb(null);
            }
        },function(cb){
            mat.setUserData(userUid,list,cb);
        }],function(err,res){
        if(err){
            response.echo("matrix.trial.fresh", jutil.errorInfo(err));
        } else{
            response.echo("matrix.trial.fresh",returnData);
        }
    });
}
exports.start = start;