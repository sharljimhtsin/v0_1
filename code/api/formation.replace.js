/**
 * 更换编队中的人物
 * User: liyuluan
 * Date: 13-10-14
 * Time: 下午4:39
 */

var jutil = require("../utils/jutil");
var formation = require("../model/formation");
var skill = require("../model/skill");
var hero = require("../model/hero");
var specialTeam = require("../model/specialTeam");
var configManager = require("../config/configManager");
var user = require("../model/user");
var async = require("async");

/**
 * @param postData {formationUid,heroUid}
 * @param response
 * @param query
 */
function start(postData, response, query) {
    if (jutil.postCheck(postData,"formationUid","heroUid") == false ) {
        response.echo("formation.replace",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var formationUid = postData["formationUid"];
    var heroUid = postData["heroUid"];

    if (formationUid <= 0 || formationUid >= 9) {
        response.echo("formation.replace",jutil.errorInfo("configError"));
        return;
    }

    var configData = configManager.createConfig(userUid);

    var oldHeroUid = "";
    var errorMsg = null;
    var conflictSkill;
    var skillList;
    var heroList;

    async.series([function (cb) {
        //上阵等级验证
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
    },function (cb) {
    //特战队上的伙伴不能替换
        specialTeam.get(userUid,function(err,res){
            if(err) cb("dbError");
            else{
                var error = null;
                for(var key in res){
                    var mItem = res[key];
                    if(mItem["heroUid"] == heroUid){
                        error = "heroHasBattle";//武将已上阵
                        break;
                    }
                }
                cb(error);
            }
        });
    }, function (cb) {
        skill.getSkill(userUid, function (err, res) {
            skillList = res;
            cb(err);
        });
    }, function (cb) {
        hero.getHero(userUid, function (err, res) {
            heroList = res;
            cb(err);
        });
    }, function (cb) {
        formation.getUserFormation(userUid,function(err,res) { //取编队, 判断是否已上阵
            if (err || res == null) {
                cb("dbError");
            } else {
                var error = null;
                for (var key in res) { //验证是否已上阵
                    var mItem = res[key];
                    if (mItem["heroUid"] == heroUid) {
                        error = "heroHasBattle";//武将已上阵
                        break;
                    }
                    if (mItem["formationUid"] == formationUid) {
                        var skill2 = skillList.hasOwnProperty(mItem["skill2"]) ? skillList[mItem["skill2"]]["skillId"] : "";
                        var skill3 = skillList.hasOwnProperty(mItem["skill3"]) ? skillList[mItem["skill3"]]["skillId"] : "";
                        var heroConfig = configManager.createConfig(userUid).getConfig("hero");
                        var heroId = heroList[heroUid]["heroId"];
                        var skill1 = heroConfig[heroId]["talentSkill"];
                        if (skill1 == skill2 || skill1 == skill3) {
                            conflictSkill = skill1 == skill2 ? "skill2" : "skill3";
                        }
                    }
                }
                oldHeroUid = res[formationUid] != undefined ? res[formationUid]["heroUid"]:"";
                cb(error);
            }
        });
    }, function (cb) {
        if (conflictSkill) {
            formation.removePropsFromFormation(userUid, formationUid, conflictSkill, cb);
        } else {
            cb();
        }
    }, function (cb) {
        hero.getHero(userUid,function(err,res) { //取武将列表，判断武将是否存在
            if (err || res == null) {
                cb("dbError");
            } else if (res[heroUid] == null) {
                cb("heroNotExist");//武将不存在
            } else {
                cb(null);
            }
        });
    }, function (cb) {
        formation.addHeroToFormation(userUid,formationUid,heroUid,function(err,res) { //添加到阵容
            if (err) {
                cb(err);
            } else {
                cb(null);
            }
        });
    }, function (cb) {
        specialTeam.get(userUid,function(err,res){
            if(err) cb("dbError");
            else{
                for(var key in res){
                    var mItem = res[key];
                    if(mItem["heroUid"] == heroUid){
                        errorMsg = "heroHasBattle";//武将已上阵
                        break;
                    }
                }
                if(errorMsg && oldHeroUid != ""){
                    formation.addHeroToFormation(userUid,formationUid,oldHeroUid,cb);
                } else if(errorMsg){
                    formation.removeFormation(userUid,formationUid,cb);
                } else {
                    cb(null);
                }
            }
        });
    }, function(cb){
        formation.getUserFormation(userUid, function(err,res) { //取编队, 判断是否已上阵
            if (err || res == null) {
                cb("dbError");
            } else {
                for (var key in res) { //验证是否已上阵
                    var mItem = res[key];
                    if (key != formationUid && mItem["heroUid"] == heroUid) {
                        errorMsg = "heroHasBattle";//武将已上阵
                        break;
                    }
                }
                if(errorMsg && oldHeroUid != ""){
                    formation.addHeroToFormation(userUid,formationUid,oldHeroUid,cb);
                } else if(errorMsg){
                    formation.removeFormation(userUid,formationUid,cb);
                } else {
                    cb(null);
                }
            }
        });
    }], function(err) {
        if(err){
            response.echo("formation.replace",jutil.errorInfo(err));
        } else if(errorMsg){
            response.echo("formation.replace",jutil.errorInfo(errorMsg));
        } else {
            response.echo("formation.replace",{"result":1});
        }
    });
}

exports.start = start;