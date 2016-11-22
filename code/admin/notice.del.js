/**
 * notice.del
 * User: liyuluan
 * Date: 14-2-7
 * Time: 下午6:54
 */

var admin = require("../model/admin");
var redis = require("../alien/db/redis");
var jutil = require("../utils/jutil");
var notice = require("../model/notice");
var async = require("async");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["notice"], query["country"]) == false) {
        response.echo("notice.del", admin.AUTH_ERROR);
        return;
    }

    if (jutil.postCheck(postData, "city", "id") == false) {
        response.echo("notice.del", jutil.errorInfo("postError"));
        return;
    }
    admin.addOneOperationLog("announcement",query,postData);
    var country = query["country"];
    var city = postData["city"];
    var noticeId = postData["id"];

    var cityList = null;
    if (city == 0) {
        cityList = admin.getCountryCityList(country);
    } else {
        cityList = [city];
    }

    var resList = {};
    async.forEach(cityList, function(cityValue, forCb) {
        notice.delNotice(country, cityValue, noticeId, function(err, res) {
            if (err) resList[cityValue] = 0;
            else resList[cityValue] = 1;
            redis.domain(country, cityValue).s("noticeTime").set(jutil.now());
            redis.domain(country, cityValue).s("notice").del();
            forCb(null);
        });
    }, function(err, res) {
        response.echo("notice.del", resList);
    });
}

exports.start = admin.adminAPIProxy(start);