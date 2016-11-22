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

function start(postData, response, query) {
    if (jutil.postCheck(postData, "starId") == false) {
        response.echo("leagueStar.get", jutil.errorInfo("postError"));
        return false;
    }
    var userUid = query["userUid"];
    var starId = postData["starId"];
    var returnData = {};
    var leagueUid;

    async.series([function (cb) {   ///获取userInfo，体力是否充足
        leagueDragon.getStar(userUid, starId, function(err, res){
            if(err)
                cb("dbError");
            else if(res == null || res.length == 0){
                returnData["starData"] = {};
                cb(null);
            } else {
                returnData["starData"] = res;
                returnData["starData"]["hasTimes"] = Math.floor((jutil.now() - res["hasTime"])/ 604800);
                cb(null);
            }
        });
    }, function(cb){
        leagueDragon.getDragon(userUid, returnData["starData"]["leagueUid"], function(err, res){
            if(err)
                cb("dbError");
            else{
                returnData["dragonData"] = res;
                cb(null);
            }
        });
    }],function(err){
        if (err) {
            response.echo("leagueStar.get",jutil.errorInfo(err));
        } else {
            response.echo("leagueStar.get",returnData);
        }
    });
}

exports.start = start;