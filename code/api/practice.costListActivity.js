/**
 * 消费排行
 * User: one
 * Date: 14-07-7
 * Time: 上午11:50
 */
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");
var activityConfig = require("../model/activityConfig");
var user = require("../model/user");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");
var async = require("async");
var userVariable = require("../model/userVariable");
var costListActivity = require("../model/practiceCostListActivity");

exports.start = function(postData, response, query) {
    var userUid = query["userUid"];
    var openTime,endTime;
    var TOPLISTNUM = 10;
    var costList = [];
    var costListName = [];
    if(postData && postData["type"] == "getSelf") {
        async.series([
            // 获取配置数据
            function(cb) {
                activityConfig.getConfig(userUid, "costListActivity", function(err, res){
                    if (err || res == null) {
                        cb(null);
                    } else {
                        openTime = res[4];
                        endTime = res[5];
                        cb(null);
                    }
                });
            },
            function(cb) {
                costListActivity.getSelfData(userUid,openTime,endTime,TOPLISTNUM,function(err,data) {
                    if(err) {
                        cb("get db Error");
                    } else {
                        if(!(openTime <= data["dataTime"]*1 && endTime >= data["dataTime"]*1)) {
                            data["data"] = 0
                        }
                        costList = data;
                        cb(null);
                    }
                });
            }
        ],function(err) {
            if (err) {
                response.echo("practice.costListActivity", jutil.errorInfo(err));
            }
            else {
                var data = [{"name":"self","uId":userUid,"cost":costList["data"]}];
                response.echo("practice.costListActivity",data);
            }
        });
    } else {
        async.series([
            // 获取配置数据
            function(cb) {
                activityConfig.getConfig(userUid, "costListActivity", function(err, res){
                    if (err || res == null) {
                        cb("erro");
                    }  else {
                        openTime = res[4];
                        endTime = res[5];
                        cb(null)
                    }
                });
            },
            function(cb) {
                costListActivity.getCostList(userUid,openTime,endTime,TOPLISTNUM,function(err,data) {
                    if(err) {
                        cb("get db Error");
                    } else {
                        costList = data;
                        cb(null);
                    }
                });
            },
            function(cb) {
                if (costList.length > 0) {
                    async.forEach(costList, function (item, forCb) {
                        var _uId = item["userUid"];
                        user.getUser(_uId, function (err, res) {
                            if (err || res == null) cb("getUser error");
                            else {
                                costListName.push(res["userName"]);
                                forCb(null);
                            }
                        });
                    }, function (err) {
                        cb(null);
                    });
                } else {
                    cb(null);
                }
            }
        ],function(err) {
            if (err) {
                response.echo("practice.costListActivity", jutil.errorInfo(err));
            }
            else {
                var data = [];
                if(costList.length >0) {
                    for(var i= 0,l=costList.length;i<l;i++) {
                        data.push({"name":costListName[i],"uId":costList[i]["userUid"],"cost":costList[i]["consume"]});
                    }
                }
                response.echo("practice.costListActivity",data);
            }
        });
    }
}