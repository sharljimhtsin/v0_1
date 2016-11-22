/**
 * activityConfig.del
 * User: liyuluan
 * Date: 14-3-17
 * Time: 上午11:20
 */

var async = require("async");
var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var activityConfig = require("../model/activityConfig");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["shop"], query["country"]) == false) {
        response.echo("activityConfig.del", admin.AUTH_ERROR);
        return;
    }

    if (jutil.postCheck(postData, "name") == false) {
        response.echo("activityConfig.del", jutil.errorInfo("postError"));
        return;
    }
    admin.addOneOperationLog("activityM",query,postData);
    var mName = postData["name"];
    var cityL = postData["cityList"];
    var city = postData["city"];
    var country = query["country"];
    async.forEach(cityL,function(item,cb){
        activityConfig.delConfig(country, item, mName, function(err, res) {
            if (err) {
                cb(err);
            } else {
                cb(null);
            }
        });
    },function(err,res){
        if (err) response.echo("activityConfig.del", jutil.errorInfo("dbError"));
        else {
            activityConfig.getAllConfigByCC(country, city, function(err, res) {
                response.echo("activityConfig.del", res);
            });
        }
    })

}

exports.start = admin.adminAPIProxy(start);