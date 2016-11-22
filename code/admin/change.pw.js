/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-4-2
 * Time: 下午3:32
 * To change this template use File | Settings | File Templates.
 */
var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var async = require("async");
function start(postData, response, query, authorize) {
    var mName = postData["userName"];
    var mPassword = postData["oldPw"];
    var mNewPassword = postData["newPw"];
    var mCountry = postData["country"];
    var uid = query["uid"];
    admin.addOneOperationLog("cd-key",query,postData);
    async.series([
        function(cb){//验证密码
            admin.loginCheck(mName, mPassword, mCountry, function(err, res) {
                cb(err,res);
            });
        },
        function(cb){ //验证成功
            var updateUser = {};
            updateUser["password"] = admin.md5(mNewPassword);
            admin.updateUser(mCountry,updateUser,uid,function(err,res){
                cb(err,res);
            })
        }
    ],function(err,res){
        if (err)  response.echo("change.pw",jutil.errorInfo("noUser"));
        else {
            response.echo("change.pw", res);
        }
    });

}
exports.start = start;