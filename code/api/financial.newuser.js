/**
 * 新用户理财计划
 * User: luoxiaobin
 * Date: 14-3-19
 * Time: 下午4:07
 * To change this template use File | Settings | File Templates.
 */

var jutil = require("../utils/jutil");
var practice = require("../model/practice");

var financialNewUser = require("../model/financialPlanNewUser");
var achievement = require("../model/achievement");
var stats = require("../model/stats");
var mongoStats = require("../model/mongoStats");


function start(postData, response, query) {

    if (jutil.postCheck(postData, "day", "action") == false) {
        response.echo("financial.newuser", jutil.errorInfo("postError"));
        return false;
    }
    var userUid = query["userUid"];
    var day = postData['day'];
    var action = postData['action'];

    switch (action) {

        case "join":

            financialNewUser.join(userUid, function(err, res){
                if (err) {
                    response.echo("financial.newuser", jutil.errorInfo(err));
                } else {
                    stats.events(userUid,"127.0.0.1",null,mongoStats.financialNewuser);
                    //achievement.fundBuy(userUid, function(){});
                    var resultData = {};
                    resultData["newUserData"] = res;
                    response.echo("financial.newuser", resultData);
                }
            });
            break;

        case "get":
            practice.growthFinPlanNewUser(userUid, function(err, res){
                if (err || res == null) {
                    response.echo("financial.newuser", jutil.errorInfo(err));
                } else {
					var rstObj = {};
                    if (res[1] == true) {
                       rstObj[res[0]] = res[2];
                    }
                    response.echo("financial.newuser", rstObj);
                }
            });
            break;

        case "reward":
            if (isNaN(day)) {
                response.echo("financial.newuser", jutil.errorInfo("postError"));
                return false;
            }

            financialNewUser.reward(userUid, day, function(err, res){
                if (err) {
                    response.echo("financial.newuser", jutil.errorInfo(err));
                } else {
                    response.echo("financial.newuser", res);
                }
            });
            break;

        default :
            response.echo("financial.newuser.add", jutil.errorInfo("postError"));
            return false;
    }
}

exports.start = start;