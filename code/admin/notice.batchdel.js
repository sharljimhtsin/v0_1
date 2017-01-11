/**
 * Created by xiazhengxin on 2017/1/9.
 */

var admin = require("../model/admin");
var redis = require("../alien/db/redis");
var jutil = require("../utils/jutil");
var notice = require("../model/notice");
var async = require("async");
var TAG = "notice.batchdel";

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["notice"], query["country"]) == false) {
        response.echo(TAG, admin.AUTH_ERROR);
        return;
    }

    if (jutil.postCheck(postData, "city", "ids") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return;
    }
    admin.addOneOperationLog("announcement", query, postData);
    var country = query["country"];
    var city = postData["city"];
    var noticeIds = postData["ids"];
    var cityList = null;

    if (city == 0) {
        cityList = admin.getCountryCityList(country);
    } else {
        cityList = [city];
    }

    var resList = {};
    async.forEach(cityList, function (cityValue, forCb) {
        async.eachSeries(noticeIds, function (noticeId, eaCb) {
            notice.delNotice(country, cityValue, noticeId, function (err, res) {
                if (err) {
                    resList[cityValue] = 0;
                } else {
                    resList[cityValue] = 1;
                }
                redis.domain(country, cityValue).s("noticeTime").set(jutil.now());
                redis.domain(country, cityValue).s("notice").del();
                eaCb();
            });
        }, forCb);
    }, function (err, res) {
        response.echo(TAG, resList);
    });
}

exports.start = admin.adminAPIProxy(start);