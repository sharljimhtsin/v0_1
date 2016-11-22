/**
 * 设置特战队英雄
 * User: joseppe
 * Date: 14-4-22
 * Time: 上午11:51
 */

var user = require("../model/user");
var specialTeam = require("../model/specialTeam");
var hero = require("../model/hero");
var configManager = require("../config/configManager");
var async = require("async");
var jutil = require("../utils/jutil");
var formation = require("../model/formation");
var gal = require("../model/gallants");//巡游活动


function start(postData, response, query) {
    var userUid = query["userUid"];

    if (jutil.postCheck(postData, "position", "heroUid") == false) {
        response.echo("specialTeam.setHero", jutil.errorInfo("postError"));
        return false;
    }

    var position = postData["position"];
    var heroUid = postData["heroUid"];
    var configData = configManager.createConfig(userUid);
    var specialTeamConfig;/// = configData.getConfig("specialTeam");
    //var itemId = 152401;
    var specialTeamData;
    var oldHeroUid = "";
    var errorMsg = null;

    var galHeroIdList = [];

    async.series([function(cb){//取得位置信息
        specialTeam.get(userUid, function(err, res){
            if (err) {
                cb(err);
            } else if (res[position] == null) {
                cb('isLocked');
            } else {
                var error = null;
                specialTeamData = res;
                for(var p in specialTeamData){
                    if(p != position && specialTeamData[p]["heroUid"] == heroUid){
                        error = 'specialTeamHasSameHero';
                        break;
                    }
                }
                oldHeroUid = specialTeamData[position] != null ? specialTeamData[position]["heroUid"]:"";
                cb(error);
            }
        });
    }, function(cb){//根据位置取配置表信息
        var config = configData.getConfig("specialTeam");
        if(config['position'][position] == undefined){
            cb('postError');
        } else {
            specialTeamConfig = config['position'][position];
            cb(null);
        }
    }, function(cb){//判断英雄是否存在
        hero.getHero(userUid,function(err,res){
            if(err || res == null){
                cb("noThisUser");
            }else if(res[heroUid] == undefined){
                cb('heroNotExist');
            } else {
                cb(null);
            }
        });
    }, function(cb){//判断阵位英雄是否存在
        formation.getUserFormation(userUid,function(err,res) { //取编队, 判断是否已上阵
            if (err || res == null) {
                cb("dbError");
            } else {
                var error = null;
                for (var key in res) { //验证是否已上阵
                    var mItem = res[key];
                    if (mItem["heroUid"] == heroUid) {
                        error = "heroHasBattle";
                        break;
                    }
                }
                cb(error);
            }
        });
    },function(cb){//判断巡游守擂中的英雄是否存在
        gal.getUserData(userUid,function(err,res) {
            if (err || res == null) cb("dbError");
            else {
                if(res["arg"] == undefined)cb(null);
                else{
                    var galList = res["arg"];
                    for (var a in galList) {
                        for(var b in galList[a]){
                            var mItem = galList[a][b];
                            galHeroIdList.push(mItem["heroId"]);
                        }
                    }
                    cb(null);
                }
            }
        });
    },function(cb){//巡游
        hero.getHero(userUid,function(err,res){
            if (err || res == null) cb("dbError");
            else{
                if(galHeroIdList == null){
                    cb(null);
                }else{
                    var error = null;
                    for(var x in galHeroIdList){
                        var mItemId = galHeroIdList[x];
                        for(var y in res){
                            if(res[y]["heroId"] == mItemId){
                                if (res[y]["heroUid"] == heroUid) {
                                    error = "heroHasBattle";
                                    break;
                                }
                            }
                        }
                    }
                    cb(error);
                }
            }
        });
    },function(cb){//入库
        specialTeamData[position]["heroUid"] = heroUid;
        specialTeam.updateByPosition(userUid, position, specialTeamData[position], cb);
    },function(cb){//取得位置信息
        specialTeam.get(userUid, function(err, res){
            if (err) {
                cb(err);
            } else {
                specialTeamData = res;
                for(var p in specialTeamData){
                    if(p != position && specialTeamData[p]["heroUid"] == heroUid){
                        errorMsg = 'specialTeamHasSameHero';
                        break;
                    }
                }
                if(errorMsg && oldHeroUid != ""){
                    specialTeamData[position]["heroUid"] = oldHeroUid;
                    specialTeam.updateByPosition(userUid, position, specialTeamData[position], cb);
                } else if(errorMsg){
                    specialTeam.removeFormation(userUid, position, cb);
                } else {
                    cb(null);
                }
            }
        });
    },
        function(cb){//判断阵位英雄是否存在
        formation.getUserFormation(userUid,function(err,res) { //取编队, 判断是否已上阵
            if (err || res == null) {
                cb("dbError");
            } else {
                for (var key in res) { //验证是否已上阵
                    var mItem = res[key];
                    if (mItem["heroUid"] == heroUid) {
                        errorMsg = "heroHasBattle";
                        break;
                    }
                }
                if(errorMsg && oldHeroUid != ""){
                    specialTeamData[position]["heroUid"] = oldHeroUid;
                    specialTeam.updateByPosition(userUid, position, specialTeamData[position], cb);
                } else if(errorMsg){
                    specialTeam.removeFormation(userUid, position, cb);
                } else {
                    cb(null);
                }
            }
        });
    }],function(err,res){
        if(err){
            response.echo("specialTeam.setHero",jutil.errorInfo(err));
        } else {
            response.echo("specialTeam.setHero",specialTeamData[position]);
        }
    });
}

exports.start = start;