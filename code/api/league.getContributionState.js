/**
 * Created with JetBrains WebStorm.
 * User: kongyajie
 * Date: 14-6-19
 * Time: 下午7:59
 * To change this template use File | Settings | File Templates.
 */

var league = require("../model/league");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var async = require("async");
var userVariable = require("../model/userVariable");
var user = require("../model/user");
var pvptop = require("../model/pvptop");
var mongoStats = require("../model/mongoStats");

/**
 * 联盟建设状态
 * @param postData
 * @param response  ({"0":xx,"1":xx,"2":xx})
 * @param query
 */

function start(postData, response, query) {
    var userUid = query["userUid"];
    var returnData = {};

    async.series([
        //更新联盟成员的数据
        function(cb){
            async.forEach([0,1,2],function(item,forCb) {
                userVariable.getVariableTime(userUid,"leagueContribute" + item,function(err,res){
                    if(err){
                        forCb(err);
                    } else{
                        if(res == null){
                            returnData[item] = 0;
                        }else{
                            if(!jutil.compTimeDay(res["time"],jutil.now())){//不是同一天
                                returnData[item] = 0;
                            }else{
                                returnData[item] = res["value"];
                            }
                        }
                        forCb(null);
                    }
                });
            },function(err,res){
                if(err) cb(err);
                else cb(null);
            });
        }
    ],function(err){
        if (err) {
            response.echo("league.getContributionState",jutil.errorInfo(err));
        } else {
            response.echo("league.getContributionState",returnData);
        }
    });
}

exports.start = start;