/**
 * Created with JetBrains WebStorm.
 * User: kongyajie
 * Date: 14-3-4
 * Time: 下午5:20
 * To change this template use File | Settings | File Templates.
 */

var pvptop = require("../model/pvptop");
var async = require("async");
var jutil = require("../utils/jutil");

/**
 * pvp玩家阵位信息
 * @param postData
 * @param response
 * @param query
 */
function start(postData, response, query){
    if (jutil.postCheck(postData,"userUid") == false) {
        response.echo("pvp.formation",jutil.errorInfo("postError"));
        return;
    }

    var formationInfo = null;
    var userUid = postData["userUid"];
    async.series([
        function(cb){ ///取用户阵容
            pvptop.getPvpTopFormation(userUid,function(err,res){
                if(err || res == null){
                    cb(null);
                }else{
                    formationInfo = res;
                    cb(null);
                }
            });
        }
    ],function(err){
        if(err){
            response.echo("pvp.formation",jutil.errorInfo(err));
        }else{
            response.echo("pvp.formation",formationInfo);
        }
    });
}

exports.start = start;