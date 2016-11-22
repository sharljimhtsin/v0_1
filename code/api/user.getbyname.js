/**
 * 查询用户名
 * User: dusongzhi
 * Date: 14-03-12
 * Time: 上午10:27
 */

var jutil = require("../utils/jutil");
var user = require("../model/user");
var formation = require("../model/formation");
var configManager = require("../config/configManager");
var async = require("async");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "userName") == false) {
        response.echo("user.getbyname", jutil.errorInfo("postError"));
        return false;
    }
    var userUid = query["userUid"];
    var userName = jutil.filterWord(postData['userName']);

    var searchUid;
    var returnData = {};
    async.series([
        function (callbackFn) {//get search uid
            user.getUidByName(userUid, userName, function (err, res) {
                if (err) {
                    callbackFn(new jutil.JError("dbError"), null);
                } else if (res == null) {
                    searchUid = 0;
                } else {
                    searchUid = res.userUid;
                }
                callbackFn(null, null);
            });
        },
        function (callbackFn) {//get user
            if (searchUid == 0){
                callbackFn(null, null);
                return;
            }
            user.getUser(searchUid, function (err, res) {
                returnData = res;
                formation.getUserHeroId(searchUid, function (err, hres) {
                    returnData["heroId"] = hres;
                    callbackFn(null, null);
                });
            });
        }

    ], function (err, value) {
        if (err) {
            console.log(err.stack);
            response.echo("user.getbyname", jutil.errorInfo(err.info));//创建失败
        } else {
            response.echo("user.getbyname", {"result": returnData});
        }
    });
}

exports.start = start;