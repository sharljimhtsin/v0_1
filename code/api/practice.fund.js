/**
 * 成長基金
 * User: luoxiaobin
 * Date: 14-3-19
 * Time: 下午4:07
 * To change this template use File | Settings | File Templates.
 */

var jutil = require("../utils/jutil");
var practice = require("../model/practice");

var practiceFund = require("../model/practiceFund");
var achievement = require("../model/achievement");

function start(postData, response, query) {
    //action: join/get/reward
    if (jutil.postCheck(postData, "lv", "action") == false) {
        response.echo("practice.fund", jutil.errorInfo("postError"));
        return false;
    }
    var userUid = query["userUid"];
    var lv = postData['lv'];
    var action = postData['action'];


    switch (action) {

        case "join":
            practiceFund.join(userUid, function(err, res){
                if (err) {
                    response.echo("practice.fund", jutil.errorInfo(err));
                } else {
                    achievement.fundBuy(userUid, function(){});
                    var resultData = {};
                    resultData["newUserData"] = res;
                    response.echo("practice.fund", resultData);
                }
            });
            break;

        case "get":
            practice.growthFund(userUid, function(err, res){
                if (err) {
                    response.echo("practice.fund", jutil.errorInfo(err));
                } else {
                    var rstObj = {};
                    if (res[1] == true) {
                        rstObj[res[0]] = res[2];
                    }
                    response.echo("practice.fund", rstObj);
                }
            });
            break;

        case "reward":
            if (isNaN(lv)) {
                response.echo("practice.fund", jutil.errorInfo("postError"));
                return false;
            }

            practiceFund.reward(userUid, lv, function(err, res){
                if (err) {
                    response.echo("practice.fund", jutil.errorInfo(err));
                } else {
                    response.echo("practice.fund", res);
                }
            });
            break;

        default :
            response.echo("practice.add", jutil.errorInfo("postError"));
            return false;
    }
}

exports.start = start;