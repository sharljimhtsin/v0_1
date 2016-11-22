/**
 * 获取地图
 * User: jichang
 * Date: 13-10-28
 * Time: 下午2:07
 * To change this template use File | Settings | File Templates.
 */
var jutil = require("../utils/jutil");
var map = require("../model/map");
var bigMap = require("../model/bigMap");
var async = require("async");
var userVariable = require("../model/userVariable");
function start(postData, response, query){
    var userUid = query["userUid"];
    var returnData;
    async.series([
        function(cb){
            map.getMap(userUid,function(err,res){
                if(err){
                    cb(err,null);
                }else{
                    returnData = res;
                    cb(null,null);
                }
            });
        },
        function(cb){
            bigMap.getBigMap(userUid,function(err,res){
                if(err){
                    cb(err,null);
                }else{
                    returnData["bigMap"] = res;
                    cb(null,null);
                }
            });
        },
        function(cb){
            userVariable.getVariableTime(userUid,"continueValue",function(err,res){
		        var continueData = {};
                if(err){
                    cb(err,null);
                }else{
                    if(res == null){
                        continueData["time"] = jutil.now();
                        continueData["value"] = 0;
                    }else{
                        continueData = res;
                    }
                    returnData["CDing"] = continueData;
                    cb(null,null);
                }
            })
        }
    ],function(err,res){
        if (err) {
            response.echo("map.get",jutil.errorInfo("dbError"));
        } else {
            response.echo("map.get",returnData);
        }
    });
//    map.getMap(userUid,function(err,res){
//
//    });
}
exports.start = start;
