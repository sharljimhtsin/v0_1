/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 13-11-15
 * Time: 下午3:46
 * 刷新竞技场积分
 * To change this template use File | Settings | File Templates.
 */
var async = require("async");
var userVariable = require("../model/userVariable");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var pvptop = require("../model/pvptop");


function start(postData, response, query) {
//    if (jutil.postCheck(postData,"type") == false) {
//        response.echo("pvp.refreshPoint",jutil.errorInfo("postError"));
//        return;
//    }
    var userUid = query["userUid"];
    var pointInfo = {};   //积分信息


    async.series([
        function(callback){ ///取用户当前排名
            pvptop.getCurrentPoint(userUid,function(err,res){
                if(err || res == null){
                    callback(null);
                }else{
                    pointInfo = res;
                    callback(null);
                }
            });
        }
//        },
//        function(callback){
//            userVariable.setVariableTime(userUid,"redeemPoint",pointInfo["value"],pointInfo["time"],function(err,res){
//                if(err){
//                    callback(err);
//                }else{
//                    callback(null);
//                }
//            });
//        }
    ],function(err){
        if(err){
            response.echo("pvp.refreshPoint",jutil.errorInfo(err));
        }else{
            response.echo("pvp.refreshPoint",pointInfo);
        }
    });
}
exports.start = start;