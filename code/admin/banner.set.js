/**
 * banner.set--运营活动提示：设置
 * User: za
 * Date: 15-5-5
 * Time: 下午5:04
 */
var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");
var redis = require("../alien/db/redis");
var mysql = require("../alien/db/mysql");
function start(postData, response, query, authorize) {
    admin.addOneOperationLog("bannerSet",query,postData);
    var content = postData["content"];
    var city = postData["city"];
    var country = query["country"];
    if(city == 0) city = 1;
    redis.domain(country, city).s("bannerP").set(content,function(err,res){
        if(err){
            response.echo("banner.set", jutil.errorInfo("dbError"));
        }else{
            response.echo("banner.set",res);
        }
    });
}
exports.start = admin.adminAPIProxy(start);