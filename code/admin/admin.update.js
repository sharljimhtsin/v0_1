/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-4-2
 * Time: 下午5:54
 * To change this template use File | Settings | File Templates.
 */

var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var async = require("async");
function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["createAdmin"], query["country"]) == false) { //判断有没有查看用户信息的权限
        response.echo("admin.list", admin.AUTH_ERROR);
        return;
    }
    admin.addOneOperationLog("accountM",query,postData);
    var country = query["country"];
    var returnData = [];
    var changeUid = postData["changeUid"];
    //var authorize = postData["authorize"];
    var group = postData["group"];
    var channel = postData["channel"];
    var updateUser = {};
    //updateUser["authorize"] = postData["authorize"];
    updateUser["group"] = postData["group"];
    updateUser["channel"] = postData["channel"];
    updateUser["login"] = postData["login"];
    updateUser["userView"] = postData["userView"];
    updateUser["userModify"] = postData["userModify"];
    updateUser["createAdmin"] = postData["createAdmin"];
    updateUser["sendGift"] = postData["sendGift"];
    updateUser["shop"] = postData["shop"];
    updateUser["sendMail"] = postData["sendMail"];
    updateUser["applyMail"] = postData["applyMail"];
    updateUser["applyMailList"] = postData["applyMailList"];
    updateUser["notice"] = postData["notice"];
    updateUser["serverModify"] = postData["serverModify"];
    updateUser["statistic"] = postData["statistic"];
    async.series([
        function(cb){
            admin.updateUser(country,updateUser,changeUid,function(err,res){
                cb(err,res);
            });
        },
        function(cb){
            admin.getAdminList(country,function(err,res){
                if(err) cb(err,res);
                else{
                    for(var i = 0 ; i < res.length ; i++){
                        var item = res[i];
                        item["password"] = "";
                        returnData.push(item);
                    }
                    cb(null,res);
                }
            });
        }
    ],function(err,res){
        if(err) response.echo("admin.update", jutil.errorInfo(err));
        else{
            response.echo("admin.update", returnData);
        }
    });
}
exports.start = admin.adminAPIProxy(start);