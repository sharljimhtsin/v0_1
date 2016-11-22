/**
 * user.hero 用户英雄队列
 * User: joseppe
 * Date: 14-4-9
 * Time: 上午11:59
 */


var admin = require("../model/admin");
var hero = require("../model/hero");
var jutil = require("../utils/jutil");
var async = require("async");
var configManager = require("../config/configManager");
var formation = require("../model/formation");
var specialTeam = require("../model/specialTeam");
var user = require("../model/user");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userModify"], query["country"]) == false) {
        response.echo("user.hero.add", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid", "heroUid", "formationUid") == false) {
        response.echo("user.hero.add", jutil.errorInfo("postError"));
        return;
    }
    admin.addOneOperationLog("userInfo",query,postData);

    var userUid = postData["userUid"];
    var heroUid = postData["heroUid"];
    var formationUid = postData["formationUid"];

    var configData = configManager.createConfig(userUid);

    async.series([
        function(cb){
            hero.getHero(userUid,function(err,res) { //取武将列表，判断武将是否存在
                if (err || res == null) {
                    cb("dbError");
                } else {
                    if (res[heroUid] == null) {
                        cb("heroNotExist");//武将不存在
                    } else {
                        cb(null);
                    }
                }
            });
        },
        function(cb){
            user.getUser(userUid,function(err,res){
                if(err || res == null) cb("dbError");
                else{
                    //var exp = res["exp"];
                    //var userLevel = configData.userExpToLevel(exp);
                    var playerConfig = configData.getConfig("player");
                    var formationSize = playerConfig[res["lv"]]["formationSize"];
                    if(formationUid > formationSize){
                        cb("userLevelInsufficient");
                    }else{
                        cb(null);
                    }
                }
            });
        },
        function(cb){
            specialTeam.get(userUid,function(err,res){
                if(err) cb("dbError");
                else{
                    for(var key in res){
                        var mItem = res[key];
                        if(mItem["heroUid"] == heroUid){
                            cb("heroHasBattle");//武将已上阵
                        }
                    }
                    cb(null);
                }
            });
        },
        function(cb){
            formation.getUserFormation(userUid, function(err, res) {
                for(var i in res){
                    if(res[i]["heroUid"] == heroUid){
                        cb("heroHasBattle");
                        return ;
                    }
                }
                cb(null);
            });
        },
        function(cb){
            formation.addHeroToFormation(userUid,formationUid,heroUid,cb);
        }
    ], function(err ,res){
        if(err){
            response.echo("user.hero.add", jutil.errorInfo(err));
        } else {
            response.echo("user.hero.add", {"status":1});
        }
    });
}
exports.start = admin.adminAPIProxy(start);