/**
 * Created with JetBrains WebStorm.
 * User: kongyajie
 * Date: 14-6-19
 * Time: 下午7:59
 * To change this template use File | Settings | File Templates.
 */

var user = require("../model/user");
var league = require("../model/league");
var jutil = require("../utils/jutil");
var async = require("async");
var pvptop = require("../model/pvptop");
var configManager = require("../config/configManager");

/**
 * 返回加入联盟申请
 * @param postData  ({"leagueUid":xx})
 * @param response
 * @param query
 */

function start(postData, response, query) {
    if (jutil.postCheck(postData,"leagueUid") == false) {
        response.echo("league.getApply",jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var leagueUid = postData["leagueUid"];

    var returnData;
    var applyUserUids = [];

    var configData = configManager.createConfig(userUid);

    async.series([
        function(cb){
            league.getLeagueAllApply(userUid,leagueUid,function(err,res){
                if(err){
                    cb(err);
                }else{
                    returnData = res;
                    for(var key in res){
                        applyUserUids.push(res[key]["applyUserUid"]);
                    }
                    cb(null);
                }
            });
        },

        function(cb){
            async.forEach(applyUserUids,function(item,forCb) {
                pvptop.getPvpUserInfo(item,function(err,res) {
                    if (err) forCb("dbError");
                    else {
                        returnData[item]["userName"] = res["userName"];
                        returnData[item]["heroId"] = res["heroIdList"][0];
                        pvptop.getUserTop(item,function(err,res){
                            if (err) forCb("dbError");
                            else{
                                returnData[item]["rank"] = res["top"];
                                user.getUser(item,function(err,res){
                                    if(err) forCb(err);
                                    else{
                                        //var exp = res["exp"];
                                        //var userLevel = configData.userExpToLevel(exp);
                                        returnData[item]["userLevel"] = res["lv"];
                                        forCb(null);
                                    }
                                });
                            }
                        });
                    }
                });
            },function(err,res){
                if(err) cb(err);
                else cb(null);
            });
        }
    ],function(err){
        if (err) {
            response.echo("league.getApply",jutil.errorInfo(err));
        } else {
            response.echo("league.getApply",returnData);
        }
    });
}

exports.start = start;