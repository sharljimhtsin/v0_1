/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-3-26
 * Time: 下午7:26
 * To change this template use File | Settings | File Templates.
 */
var jutil = require("../utils/jutil");
var activeMap = require("../model/activeMap");
function start(postData, response, query){
    var userUid = query["userUid"];
    activeMap.getActiveMapData(userUid,function(err,res){
        if(err != null){
            response.echo("activeMap.get",jutil.errorInfo(err));
        }else{
            response.echo("activeMap.get",{"activeMapData":res,"requestTime":jutil.now()});
        }
    });
}
exports.start = start;