/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-5-20
 * 绑定账户
 * Time: 下午12:30
 * To change this template use File | Settings | File Templates.
 */
var platformConfig = require("../../config/platform");
var async = require("async");
var jutil = require("../utils/jutil");
var login = require("../model/login");
function start(postData, response, query) {
    var platformId = postData["platformId"];
    var mConfig = platformConfig[platformId];
    var mCountry = mConfig["country"]; //大区
    var platformUserId = postData["platformUserId"];
    var udid = postData["udid"];
    if (mConfig == null || mConfig["country"] == null) {
        response.echo("user.getToken",jutil.errorInfo("configError"));
        return;
    }
    var userData;
    async.series([
        function(cb) { //获取用户的信息
            login.getCountryUserData(mCountry, platformId, udid, function(err, res) {
                if (err || res == null) {
                    console.log("kingnetblindinggetUser........." , err);
                    if (err) cb("noThisUser");
                } else {
                    userData = res;
                    console.log("平台用户ID", mCountry, res);
                    cb(null);
                }
            });
        },
        function(cb) { //没有绑定那就绑定账户
            if(userData["udid"] != "" ) { //已经绑定了用户
                cb("hasBlinding");
            }else {
                login.blindingAccount(mCountry , platformId , udid , platformUserId , function (err , res) {
                   if(err) {
                       console.log("kingnetblinding........." , err);
                       cb(err);
                   } else {
                       cb(null);
                   }
                });
            }
        }
    ],function (err) {
         if(err) {
             response.echo("blinding.konton",jutil.errorInfo(err));
         }else {
             response.echo("blinding.konton",{});
         }
    } );
}
exports.start = start;