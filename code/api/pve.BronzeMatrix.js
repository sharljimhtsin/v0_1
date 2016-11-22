/**
 * Created with JetBrains WebStorm.
 * User: 铜人阵
 * Date: 13-12-17
 * Time: 下午5:06
 * To change this template use File | Settings | File Templates.
 */
var battleModel = require("../model/battle");
function start(postData, response, query) {
    var userUid = query["userUid"];
    var addInfo = postData["addInfo"];
    battleModel.returnBronzeData(userUid,addInfo,function(err,res){
        response.echo("battle.pvp",res);
    })
}
exports.start = start;