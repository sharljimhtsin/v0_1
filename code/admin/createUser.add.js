/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-4-1
 * Time: 下午2:48
 * To change this template use File | Settings | File Templates.
 */
var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var async = require("async");
function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["createAdmin"], query["country"]) == false) { //判断有没有创建用户的权限
        response.echo("createUser.add", admin.AUTH_ERROR);
        return;
    }
    if(jutil.postCheck(postData,"userName") == false || jutil.postCheck(postData,"passWord") == false){ //没有数据返回权限
        response.echo("createUser.add", {"authorize":true});
        return;
    }
    admin.addOneOperationLog("accountM",query,postData);
    var userName = postData["userName"];
    var passWord = postData["passWord"];
    //var postAuthorize = postData["authorize"];
    var country = query["country"];
    var userData = {};
    var uid = 0;
    async.series([
        function(cb){ //创建用户
            userData["name"] = userName;
            userData["password"] = admin.md5(passWord);
            userData["login"] = postData["login"];
            userData["userView"] = postData["userView"];
            userData["userModify"] = postData["userModify"];
            userData["createAdmin"] = postData["createAdmin"];
            userData["sendGift"] = postData["sendGift"];
            userData["shop"] = postData["shop"];
            userData["sendMail"] = postData["sendMail"];
            userData["applyMail"] = postData["applyMail"];
            userData["applyMailList"] = postData["applyMailList"];
            userData["notice"] = postData["notice"];
            userData["serverModify"] = postData["serverModify"];
            userData["statistic"] = postData["statistic"];
            userData["group"] = postData["group"];
            userData["channel"] = postData["channel"];
            userData["authorize"] = 1;
            if(passWord == "" || userName == ""){
                cb(null,null);
                return;
            }
            admin.createUser(country,userData,function(err,res){
                uid = res['insertId'];
                cb(err,null)
            })
        }
    ],function(err,res){
        if(err){
            response.echo("createUser.add", jutil.errorInfo(err));
        }else{
            response.echo("createUser.add", {"authorize":true});
        }
    });

}
exports.start = admin.adminAPIProxy(start);;