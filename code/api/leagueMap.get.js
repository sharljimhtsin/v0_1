/**
 * Created with JetBrains WebStorm.
 * User: joseppe
 * Date: 14-10-21
 * Time: 上午11:30
 * 联盟副本获取状态
 */

var league = require("../model/league");
var leagueMap = require("../model/leagueMap");
var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");
var userVariable = require("../model/userVariable");
var configManager = require("../config/configManager");
//var bloodReward = require("../model/bloodReward");
/**
 * 获取联盟地图
 * @param postData  ({"leagueUid":xx})
 * @param response
 * @param query
 */

function start(postData, response, query) {
    if (jutil.postCheck(postData,"leagueUid") == false) {
        response.echo("leagueMap.get",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var leagueUid = postData["leagueUid"];
    //bloodReward.addSever(userUid);
    var configData = configManager.createConfig(userUid);
    var leagueMapCofig = configData.getConfig("guildMap")["bigMap"];
    var mapdata = {};
    var next = {"bigMapId":1,"bigNext":true,"mapId":1,"next":true};
    var userData;
    var times = 0;
    async.series([
        function (cb) {   ///获取userInfo，体力是否充足
            user.getUser(userUid, function (err, res) {
                if (err || res == null) {
                    cb("noThisUser", null);
                } else {
                    userData = res;
                    cb(null, null);
                }
            })
        },
        function(cb){//验证联盟数据存在
            userVariable.getVariableTime(userUid, "leagueMap", function(err, res){
                if(err)
                    cb(err);
                else if(res == null)
                    cb(null);
                else {
                    if(res["time"] >= jutil.todayTime()){
                        times = res["value"];
                    }
                    //if(times >= leagueMapConfig["dailyMaxTime"]){
                    //    cb("pveOverTimes");
                    //} else {
                    cb(null);
                    //}
                }
            });
        },
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
        function(cb){//取得地图配置
            leagueMap.getAllMap(userUid,leagueUid,function(err, res){
                if(err)
                    cb("dbError");
                else{
                    for(var i in res){
                        var mapItem = res[i];
                        var bigMapId = mapItem["bigMapId"];
                        var mapId = mapItem["mapId"];
                        if(mapdata[bigMapId] == undefined){
                            mapdata[bigMapId] = {"allhp":0, "killhp":0, "progress":0, map:{}};
                        }
                        mapdata[bigMapId]["map"][mapId] = mapItem;
                        mapdata[bigMapId]["map"][mapId]["allhp"] = 0;
                        mapdata[bigMapId]["map"][mapId]["killhp"] = 0;
                        mapdata[bigMapId]["map"][mapId]["progress"] = 0;
                    }
                    cb(null);
                }
            });
        },
        function(cb){
            for(var bigMapId in mapdata){
                var mapCofig = leagueMapCofig[bigMapId]["map"];
                for(var mapId in mapCofig){
                    var formation = mapCofig[mapId]["formation"];
                    for(var npc in formation){
                        mapdata[bigMapId]["allhp"] += formation[npc]["hp"]-0;//大地图总血量
                        if(mapdata[bigMapId]["map"][mapId] != undefined)
                            mapdata[bigMapId]["map"][mapId]["allhp"] += formation[npc]["hp"]-0;//小地图总血量
                    }
                    if(mapdata[bigMapId]["map"][mapId] != undefined){
                        if(mapdata[bigMapId]["map"][mapId]["finish"] == 1){
                            mapdata[bigMapId]["killhp"] += mapdata[bigMapId]["map"][mapId]["allhp"]-0;//大地图总被打掉的血量
                            mapdata[bigMapId]["map"][mapId]["killhp"] = mapdata[bigMapId]["map"][mapId]["allhp"];//小地图总被打掉的血量
                        } else {
                            for(var j = 1; j <= 8; j++){
                                mapdata[bigMapId]["killhp"] += mapdata[bigMapId]["map"][mapId]["npc"+j]-0;//大地图总被打掉的血量
                                mapdata[bigMapId]["map"][mapId]["killhp"] += mapdata[bigMapId]["map"][mapId]["npc"+j]-0;//小地图总被打掉的血量
                            }
                        }
                        mapdata[bigMapId]["map"][mapId]["progress"] = Math.floor(mapdata[bigMapId]["map"][mapId]["killhp"] * 100 / mapdata[bigMapId]["map"][mapId]["allhp"]);//小地图进度
                        //是否自动打开下一关小地图
                        next["mapId"] = mapId;
                        next["next"] = false;
                        if(mapdata[bigMapId]["map"][mapId]["killhp"] >= mapdata[bigMapId]["map"][mapId]["allhp"] && mapCofig[mapId]["next"] > 0){
                            next["mapId"] = mapCofig[mapId]["next"];
                            next["next"] = true;
                        }
                    }
                }
                mapdata[bigMapId]["progress"] = Math.floor(mapdata[bigMapId]["killhp"] * 100 / mapdata[bigMapId]["allhp"]);//大地图进度
                //是否自动打开下一关大地图
                next["bigMapId"] = bigMapId;
                next["bigNext"] = false;
                if(mapdata[bigMapId]["killhp"] >= mapdata[bigMapId]["allhp"] && leagueMapCofig[bigMapId]["next"] > 0){
                    next["bigMapId"] = leagueMapCofig[bigMapId]["next"];
                    next["mapId"] = 1;
                    next["bigNext"] = true;
                }
            }
            cb(null);
        },
        function(cb){
            if(next["bigNext"] || next["next"]){
                leagueMap.createMap(userUid, leagueUid, next["bigMapId"], next["mapId"], function(err, res){
                    var newMap = res;
                    newMap["allhp"] = 0;
                    newMap["killhp"] = 0;
                    newMap["progress"] = 0;
                    if(next["bigNext"]){
                        mapdata[next["bigMapId"]] = {"allhp":0, "killhp":0, "progress":0, map:{}};
                        var mapCofig = leagueMapCofig[next["bigMapId"]]["map"];
                        for(var mapId in mapCofig){
                            var formation = mapCofig[mapId]["formation"];
                            for(var npc in formation){
                                mapdata[next["bigMapId"]]["allhp"] += formation[npc]["hp"]-0;//大地图总血量
                            }
                        }
                    }
                    mapdata[next["bigMapId"]]["map"][res["mapId"]] = newMap;
                    var formation = leagueMapCofig[next["bigMapId"]]["map"][next["mapId"]]["formation"];
                    for(var npc in formation){
                        mapdata[next["bigMapId"]]["map"][next["mapId"]]["allhp"] += formation[npc]["hp"]-0;//小地图总血量
                    }
                    cb(null);
                });
            } else {
                cb(null);
            }
        }
    ],function(err){
        if (err) {
            response.echo("leagueMap.get",jutil.errorInfo(err));
        } else {
            response.echo("leagueMap.get",{"mapdata":mapdata,"times":times});
        }
    });
}

exports.start = start;