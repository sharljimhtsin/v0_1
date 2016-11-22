/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-2-26
 * Time: 下午12:18
 * To change this template use File | Settings | File Templates.
 */
var userVariable = require("../model/userVariable");
var jutil = require("../utils/jutil");
function start(postData, response, query){
    var userUid = query["userUid"];
    var returnData = {};
    userVariable.getVariableTime(userUid,"buyPhysical",function(err,res){
        if(err){
            response.echo("pve.getBuyPowerTimes",jutil.errorInfo("getBuyPhysicalTimeWrong"));
        }else{
            var value = 0;
            if(res == null){
                value = 0;
            }else{
                var time = res["time"];
                if(jutil.compTimeDay((time - 0),(jutil.now() - 0)) == false){
                    value = 0;
                }else{
                    value = res["value"];
                }
            }
            returnData["times"] = value;
            response.echo("pve.getBuyPowerTimes",returnData);
        }
    });
}
exports.start = start;