/**
 * banner.get--运营活动提示：取数据
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
    admin.addOneOperationLog("bannerGet",query,postData);
    var city = postData["city"];
    var country = query["country"];
    if(city == 0) city = 1;
    redis.domain(country, city).s("bannerP").get(function(err,res){
        if(err){
            response.echo("banner.get", jutil.errorInfo("dbError"));
        }else{
            var real = res == null ?"请输入一些东西":res;
            response.echo("banner.get",real);
        }
    });
}
exports.start = admin.adminAPIProxy(start);
