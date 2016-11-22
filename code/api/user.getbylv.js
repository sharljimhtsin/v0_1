/**
 * 查询某个等级的用户列表
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
    if (jutil.postCheck(postData, "lv") == false) {
        response.echo("user.getbylv", jutil.errorInfo("postError"));
        return false;
    }
    var userUid = query["userUid"];
    var lv = parseInt(postData["lv"]);
    var limit = 10;

    var uids = {};
    var returnData = {};

    async.series([
        function (callbackFn) {//get uid list
            user.getUserBylv(userUid, lv, limit, function (res) {
                uids = res;
                callbackFn(null, null);
            });
        },
        function (callbackFn) {//get userlist
            if (uids == null) {
                callbackFn(null, null);
                return;
            }
            async.forEach(Object.keys(uids), function (i, cb) {
                user.getUser(uids[i].userUid, function (err, ures) {
                    if (err || ures == null) {
                        cb(err);
                    } else {
                        returnData[uids[i].userUid] = ures;
                        formation.getUserHeroId(uids[i].userUid, function (err, res) {
                            returnData[uids[i].userUid]["heroId"] = res;
                            cb(null);
                        });
                    }
                });
            }, function (err) {
                callbackFn(null, null);
            });
        }

    ], function (err, value) {
        response.echo("user.getbylv", {"result": returnData});
    });


}

exports.start = start;
