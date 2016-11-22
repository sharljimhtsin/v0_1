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
    var county = query["country"];
    var returnData = [];
    admin.getAdminList(county,function(err,res){
        if(err) response.echo("admin.list", jutil.errorInfo(err));
        else{
            for(var i = 0 ; i < res.length ; i++){
                var item = res[i];
                item["password"] = "";
                returnData.push(item);
            }
            response.echo("admin.list", returnData);
        }
    })
}
exports.start = admin.adminAPIProxy(start);