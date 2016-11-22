/**
 * Created with JetBrains WebStorm.
 * User: jichang操作日志搜索
 * Date: 14-4-4
 * Time: 下午5:17
 * To change this template use File | Settings | File Templates.
 */
var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var async = require("async");
function start(postData, response, query, authorize) {
    var startTime = postData["startTime"];
    var endTime = postData["endTime"];
    var userName = postData["userName"];
    var logModel = postData["logModel"];
    var uid = query["uid"];
    var country = query["country"];
    admin.searchOperationLog(country,userName,logModel,startTime,endTime,function(err,res){
        if(err){
            response.echo("operationLog.search", jutil.errorInfo(err));
        }else{
            response.echo("operationLog.search", res);
        }
    });
}
exports.start = start;