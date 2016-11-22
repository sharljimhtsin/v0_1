/**
 * Created by xiayanxin on 2016/5/30.
 */


var admin = require("../model/admin");
var teach = require("../model/teach");
var jutil = require("../utils/jutil");
var async = require("async");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userModify"], query["country"]) == false) {
        response.echo("user.teach.add", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid","worldBCt","worldBLv","teachCt","teachLv") == false) {
        response.echo("user.teach.add", jutil.errorInfo("postError"));
        return;
    }
    var userUid = postData["userUid"];
    var worldBCt = postData["worldBCt"]-0;
    var worldBLv = postData["worldBLv"]-0;

    var teachCt = postData["teachCt"]-0;
    var teachLv = postData["teachLv"]-0;
    admin.addOneOperationLog("userInfo",query,postData);
    async.series([function(cb){
        if(teachCt > 0 && worldBCt > 0 && teachLv > 0 && worldBLv > 0 ){
            async.series([function(ccb){
                async.timesSeries(worldBCt,function(n,esCb){
                    teach.addWorldBossTeach(userUid,worldBLv,esCb);
                },function(err,res){
                    ccb(err);
                });
            },function(ccb){
                async.timesSeries(teachCt,function(n1,esCb){
                    teach.addTeach(userUid,teachLv,jutil.now(),esCb);
                },function(err,res){
                    ccb(err);
                });
            }],function(err,res){
                cb(err);
            });
        }else if(teachCt > 0 && teachLv > 0){
            async.timesSeries(teachCt,function(n,esCb){
                teach.addTeach(userUid,teachLv,jutil.now(),esCb);
            },function(err,res){
                cb(err);
            });
        }else if(worldBCt > 0 && worldBLv > 0){
            async.timesSeries(worldBCt,function(n,esCb){
                teach.addWorldBossTeach(userUid,worldBLv,esCb);
            },function(err,res){
                cb(err);
            });
        }else{
            cb(null);
        }
    }],function(err,res){
        if (err){
            response.echo("user.teach.add", {"ERROR":"USER_ERROR","info":err});
        } else {
            response.echo("user.teach.add", {"status":1});
        }
    });
}
exports.start = admin.adminAPIProxy(start);