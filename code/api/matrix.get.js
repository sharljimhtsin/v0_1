/**
 * Created with JetBrains WebStorm.
 * 赛亚人图阵api--matrix.get 首页
 * User: za
 * Date: 16-4-8
 * Time: 下午19:51(预计三周)
 * To change this template use File | Settings | File Templates.
 */

var jutil = require("../utils/jutil");
var async = require("async");
var mat = require("../model/matrix");
function start(postData, response, query) {
    var userUid = query["userUid"];
    var resultData = {};
    async.series([
        function(cb){
            mat.initData(userUid,function(err,res){
                if(err||res==null)cb("dbError");
                else{
                    resultData = res;
                    cb(null);
                }
            });
        }
     ],function(err,res){
        if(err){
            response.echo("matrix.get", jutil.errorInfo(err));
        } else{
            response.echo("matrix.get",resultData);
        }
    });
}
exports.start = start;