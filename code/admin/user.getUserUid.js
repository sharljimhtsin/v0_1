/**
 * 通过名字取一个用户的userUid
 * user.getUserUid
 * User: liyuluan
 * Date: 14-1-29
 * Time: 下午12:59
 */


var admin = require("../model/admin");
var user = require("../model/user");
var jutil = require("../utils/jutil");
var async = require("async");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userView"], query["country"]) == false) {
        response.echo("user.getUserUid", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userName", "city") == false) {
        response.echo("user.getUserUid", jutil.errorInfo("postError"));
        return;
    }
    var country = query["country"];
    var city = postData["city"];
    var userName = postData["userName"];
    var pUserId = postData["pUserId"];
    var userUids = [];
    admin.addOneOperationLog("userInfo",query,postData);
    async.series([
        function(cb){
            if(userName != ''){
                user.userNameToUserUid(country, city, userName, function(err, res) {
                    if (err){
                        cb(err);
                    } else {
                        for(var i in res){
                            userUids.push(res[i]);
                        }
                        cb(null);
                    }
                });
            } else {
                cb(null);
            }
        },
        function(cb){
            if(pUserId != ''){
                user.pUserIdToUserUid(country, city, pUserId, function(err, res) {
                    if (err){
                        cb(err);
                    } else {
                        for(var i in res){
                            userUids.push(res[i]);
                        }
                        cb(null);
                    }
                });
            } else {
                cb(null);
            }
        }
    ], function(err, res){
        if(err) response.echo("user.getUserUid", jutil.errorInfo(err));
         else response.echo("user.getUserUid", userUids);
    });
}
exports.start = admin.adminAPIProxy(start);