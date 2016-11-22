/**
 * Created with JetBrains WebStorm.
 * 赛亚人图阵api--matrix.saiya.rankList 赛亚人图阵模块(阵图榜)--图阵展示
 * User: za
 * Date: 16-4-8
 * Time: 下午19:51(预计三周)
 * To change this template use File | Settings | File Templates.
 */

var user = require("../model/user");
var jutil = require("../utils/jutil");
var async = require("async");
var mat = require("../model/matrix");
var modelUtil = require("../model/modelUtil");
function start(postData, response, query) {
    if (jutil.postCheck(postData, "index") == false) {
        echo("postError");
        return false;
    }
    var userUid = query["userUid"];
    var action = postData["action"];
    var currentConfig;
    var returnData = {};
    var list = {};
        async.series([function(cb){
            mat.getConfig(userUid,function(err,res){
                if(err)cb(err);
                else{
                    currentConfig = res[2];
                    cb(null);
                }
            });
        },function(cb){
            mat.getUserData(userUid,function(err,res){
                if(err)cb(err);
                else{
                    list = res;
                    cb(null);
                }
            });
    }],function(err,res){
        if(err){
            response.echo("matrix.trial", jutil.errorInfo(err));
        } else{
            response.echo("matrix.trial",res);
        }
    });
}
exports.start = start;