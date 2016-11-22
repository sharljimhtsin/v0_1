/**
 * Created with JetBrains WebStorm.
 * User: joseppe
 * Date: 15-04-28
 * Time: 下午14:52
 * 联盟神龙获取状态
 */

var league = require("../model/league");
var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");
var configManager = require("../config/configManager");
var leagueDragon = require("../model/leagueDragon");
var bitUtil = require("../alien/db/bitUtil");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "starId", "round") == false) {
        response.echo("leagueStar.battleLogList", jutil.errorInfo("postError"));
        return false;
    }
    var userUid = query["userUid"];
    var starId = postData["starId"];
    var round = postData["round"];
//    var returnData = [];
    //var leagues;

//    async.series([function (cb) {   ///获取userInfo，体力是否充足
//        league.getLeagues(userUid,function(err, res){
//            if (err)
//                cb("dbError");
//            else{
//                leagues = res;
//                cb(null);
//            }
//        });
//    }, function(cb) {
        leagueDragon.getBattleRoundData(userUid, starId, round, function(err, res){
            if(err || res == null){
                response.echo("leagueStar.battleLogList", []);
//                cb("dbError");
            } else {
                var returnData = [];
                for(var i in res){
                    returnData.push({"times":i, "actUserName":res[i]["ownTeam"]["name"], "actHeroId":res[i]["ownTeam"]["team"][0]["heroId"], "defUserName":res[i]["enemyTeam"]["name"], "defHeroId":res[i]["enemyTeam"]["team"][0]["heroId"], "isWin":res[i]["isWin"]});
                }
                returnData.sort(function(x, y){ return x.times - y.times; });
                response.echo("leagueStar.battleLogList", returnData);
//                cb(null);
            }
        });
//    }],function(err){
//        if (err) {
//            response.echo("leagueStar.battleLogList", jutil.errorInfo(err));
//        } else {
//            response.echo("leagueStar.battleLogList", returnData);
//        }
//    });
}

exports.start = start;