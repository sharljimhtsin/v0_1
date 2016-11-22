/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-4-2
 * Time: 下午5:52
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
    var changeUid = postData["changeUid"];
    var returnData = [];
    async.series([
        function(cb){
            admin.deleteAdmin(country,changeUid,function(err,res){
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
        if(err) response.echo("admin.delete", jutil.errorInfo(err));
        else{
            response.echo("admin.delete", returnData);
        }
    });
}
exports.start = admin.adminAPIProxy(start);