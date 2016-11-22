/**
 * Vip获取相应奖励
 * User: one
 * Date: 14-06-27
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
var stats = require("../model/stats");

exports.start = function(postData, response, query) {
    if (jutil.postCheck(postData, "vipAwardId") == false) {
        response.echo("practice.vipActivity", jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var _isGet = {};
    if (postData["sendType"] == "isGet") {
        async.series([
            function(cb) { //判断是否已领
                userVariable.getVariableTime(userUid, "vipActivity", function(err, res) {
                    if (err) {
                        cb({"Result":"err"});
                    } else {
                        if (res != null && jutil.compTimeDay(res["time"], jutil.now()) == true ) {
                            _isGet = {"Result":true};
                            cb(null);
                        } else {
                            _isGet = {"Result":false};
                            cb(null);
                        }
                    }
                });
            }
        ],function(err) {
            if (err) {
                response.echo("practice.vipActivity", jutil.errorInfo(err));
            }
            else {
                response.echo("practice.vipActivity",_isGet);
            }
        });
        return;
    }
    var vipAwardId = postData["vipAwardId"]*1;

    var gVIP = 0;
    var vipActivityConfig = {};
    var rtnArr = [];
    var openTime = 0;
    var endTime = 0;
    async.series([
        // 获取配置数据
        function(cb) {
            activityConfig.getConfig(userUid, "vipPackage", function(err, res){
                if (err || res == null) {
                    cb(null);
                } else if (res[0] == true) {
                    vipActivityConfig = res[2];
                    openTime = res[4];
                    endTime = res[5];
                    cb(null);
                } else {
                    cb("configError");
                }
            });
        },
        // 获取USER数据
        function(cb) {
            user.getUser(userUid,function(err,res) {
                if (err || res == null) cb("dbError");
                else {
                    var gUserData = res;
                    gVIP = res["vip"] - 0;
                    cb(null);
                }
            });
        },

        function(cb) { //判断是否已领
            userVariable.getVariableTime(userUid, "vipActivity", function(err, res) {
                if (err) {
                    cb("dbError");
                } else {
                    if (res != null && jutil.compTimeDay(res["time"], jutil.now()) == true ) {
                        cb("haveReceive");
                    } else {
                        cb(null);
                    }
                }
            });
        },

        // 检索商品数据
        function(cb) {
            if(gVIP > 2 && vipAwardId == gVIP ) {
                async.eachSeries(vipActivityConfig[gVIP], function(item, forCb) {
                    __rwHandler(userUid,item["id"],item["count"],function(err, res) {
                        if (res) {
                            rtnArr.push(res);
                        }
                        forCb(null);
                    });
                }, function(err) {
                    cb(null);
                });
            } else {
                cb("Can't get");
            }
        },

        function(cb) {
            //TODO: 根据 vipAwardId 分支
            activityConfig.getConfig(userUid, "vipPackage", function (err, res) {
                if (err || res[0] != true) {
                    return;
                }
                stats.recordWithLevel(vipAwardId, res[2], false, "", "", [mongoStats.vipActivity1, mongoStats.vipActivity2, mongoStats.vipActivity3, mongoStats.vipActivity4, mongoStats.vipActivity5, mongoStats.vipActivity6, mongoStats.vipActivity7, mongoStats.vipActivity8, mongoStats.vipActivity9, mongoStats.vipActivity10, mongoStats.vipActivity11, mongoStats.vipActivity12, mongoStats.vipActivity13, mongoStats.vipActivity14, mongoStats.vipActivity15, mongoStats.vipActivity16, mongoStats.vipActivity17, mongoStats.vipActivity18], function (tag) {
                    stats.events(userUid, "127.0.0.1", null, tag);
                }, "", "");
            });
            userVariable.setVariableTime(userUid, "vipActivity", 1, jutil.now(), function(err, res) {
                if (err) {
                    console.error("practice.vipActivity", err.message, err.stack);
                    cb(null);
                } else {
                    cb(null);
                }
            });
        }
    ], function(err){
        if (err) {
            response.echo("practice.vipActivity", jutil.errorInfo(err));
        }
        else {
            response.echo("practice.vipActivity",rtnArr);
        }
    });
}
function __rwHandler(userUid, id, count, cb) {
    switch (id) {
        default:
            modelUtil.addDropItemToDB(id,count,userUid,0,1,function(err,res) {
                if (err) {
                    cb("dbError");
                }
                else {
                    cb(null, res);
                }
            });
            break;
    }
}