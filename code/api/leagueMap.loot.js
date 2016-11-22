/**
 * Created with JetBrains WebStorm.
 * User: joseppe
 * Date: 14-11-1
 * Time: 下午18:02
 * 联盟副本掉落获取
 */


var league = require("../model/league");
var leagueMap = require("../model/leagueMap");
var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");
var configManager = require("../config/configManager");


function start(postData, response, query) {
    if (jutil.postCheck(postData,"leagueUid","bigMapId") == false) {
        response.echo("leagueMap.loot",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var leagueUid = postData["leagueUid"];
    var bigMapId = postData["bigMapId"];
    var configData = configManager.createConfig(userUid);

    var loots = [];
    var leagueMapIds = {};
    async.series([
        function(cb){//验证联盟数据存在
            league.getLeague(userUid,leagueUid,function(err, res){
                if (err)
                    cb("dbError");
                else if(res == null)
                    cb("noLeague");
                else
                    cb(null);
            });
        },
        function(cb){
            league.getMember(userUid,leagueUid,userUid,function(err,res){
                if(err || res == null){
                    cb("dbError");
                } else{
                    cb(null);
                }
            });
        },
        function(cb){//取得地图掉落
            leagueMap.getLoot(userUid,leagueUid,bigMapId,function(err,res){//取得未过期掉落
                if(err){
                    cb("dbError");
                } else{
                    //loots = res;
                    for(var i in res){
                        var loot = res[i];
                        if(loot["lootTimeout"] <= jutil.now() || loot["status"] != 0){
                            continue;
                        }
                        loots.push(res[i]);
                    }
                    cb(null);
                }
            });
        },
//        function(cb){//取得地图id
//            leagueMap.getAllMap(userUid,leagueUid,function(err,res){//取得未过期掉落
//                if(err){
//                    cb("dbError");
//                } else{
//                    for(var i in res){
//                        var mapdata = res[i];
//                        if(mapdata["bigMapId"]  == bigMapId){
//                            leagueMapIds[""] = mapdata["leagueMapId"];
//                        }
//                    }
//                    cb(null);
//                }
//            });
//        },
//        function(cb){//取得攻击过的用户
//            async.each(leagueMapIds, function(leagueMapId, esCb){
//
//            });
//            for(var i in loots){
//                for(var j in leagueMapIds){
//
//                }
//            }
//            cb(null);
//        },
//        function(cb){//过滤未打过的用户
//            for(var i in loots){
//                for(var j in leagueMapIds){
//
//                }
//            }
//            cb(null);
//        },
        function(cb){
            for(var i in loots){
                var loot = loots[i];
                loot["reward"] = JSON.parse(loot["reward"]);
                switch(loot["reward"]["id"].substr(0,2)){
                    case "10"://hero 魂魄
                        var config = configData.getConfig("hero");
                        loot["reward"]["name"] = config[loot["reward"]["id"]]["name"];
                        break;
                    case "11"://skill 技能  或者技能碎片
                        var config = configData.getConfig("skill");
                        loot["reward"]["name"] = config[loot["reward"]["id"]]["name"];
                        break;
                    case "12"://装备
                    case "13"://装备
                    case "14"://装备
                        var config = configData.getConfig("equip");
                        loot["reward"]["name"] = config[loot["reward"]["id"]]["name"];
                        break;
                    case "15"://item
                        var config = configData.getConfig("item");
                        loot["reward"]["name"] = config[loot["reward"]["id"]]["name"];
                        break;
                    case "17"://卡片
                        var config = configData.getConfig("card");
                        loot["reward"]["name"] = config[loot["reward"]["id"]]["name"];
                        break;
                    default:
                        loot["reward"]["name"] = loot["reward"]["id"];
                        break;
                }
                loot["reward"]["name"];
                //loots.push(loot);
            }
            cb(null);
        },
        function(cb){//获取竞拍记录，标记是否已经竞拍
            async.each(loots, function(loot, forCb){
                leagueMap.getAuction(userUid,loot["lootId"],function(err,res){
                    if(err){
                        forCb("dbError");
                    } else if(res == null){
                        loot["canAuction"] = 1;
                        forCb(null);
                    } else {
                        loot["canAuction"] = 1;
                        for(var i in res){
                            if(res[i]["userUid"] == userUid){
                                loot["canAuction"] = 0;
                                break;
                            }
                        }
                        forCb(null);
                    }
                });
            }, function(err){
                cb(err);
            });
        }
    ],function(err){
        if (err) {
            response.echo("leagueMap.loot",jutil.errorInfo(err));
        } else {
            response.echo("leagueMap.loot",loots);
        }
    });
}

exports.start = start;