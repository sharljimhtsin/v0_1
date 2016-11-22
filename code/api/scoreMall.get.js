/**
 * 积分商城获取接口
 * User: za
 * Date: 14-12-11
 * Time: 下午21:30
 */
var jutil = require("../utils/jutil");
var async = require("async");
var activityConfig = require("../model/activityConfig");
var item = require("../model/item");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");
var scoreMall = require("../model/scoreMall");

function start(postData, response, query) {
    var userUid = query["userUid"];
    scoreMall.getData(userUid, function(err, res){
        if(err){
            response.echo("scoreMall.get", jutil.errorInfo(err));
        } else {
            response.echo("scoreMall.get", {"data":res[3],"shopList":res[2]["shopList"]});
        }
    }, true);
}
exports.start = start;