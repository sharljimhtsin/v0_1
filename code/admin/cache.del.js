/**
 * cache.del
 * User: liyuluan
 * Date: 14-3-1
 * Time: 下午6:57
 */


var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var async = require("async");
var redis = require("../alien/db/redis");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["shop"], query["country"]) == false) {
        response.echo("cache.del", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "key") == false) {
        response.echo("cache.del", jutil.errorInfo("postError"));
        return;
    }

    var country = query["country"];
    var city = postData["city"];
    var key = postData["key"];
    var name = postData["name"];
    var userUid = postData["userUid"];
    var keyType = postData["keyType"];
    var redisDB;

    var cityList = [];
    if(keyType == undefined){
        try {
            var mConfig = require("../../config/" + country + "_server.json");
            if (mConfig != null) {
                var mServerList = mConfig["serverList"];
                for (var city in mServerList) {
                    cityList.push(city);
                }
            }
            keyType = "domain";
        } catch (error) {

        }
    } else {
        cityList = [city];
    }
    async.eachSeries(cityList, function(city, esCb){
        switch (keyType){
            case 'user':
                redisDB = redis.user(userUid);
                break;
            case 'domain':
                redisDB = redis.domain(country,city);
                break;
            case 'login':
                redisDB = redis.login(country);
                break;
        }
        if(/\*/.test(key)){
            redisDB.k(key).keys(function(err, res){
                async.eachSeries(res, function(k,cb){
                    var sk = k.split(":");
                    if(keyType == "user"){
                        sk.pop();
                    } else if(keyType == "domain") {
                        sk.shift();
                    }
                    var nk = sk.join(":");
                    delKey(nk,cb);
                }, esCb);
            });
        } else {
            delKey(key, esCb);
        }
        function delKey(key, callbackFn){
            redisDB.k(key).type(function(err, res){
                switch (res){
                    case "string":
                        redisDB.s(key).del(callbackFn);
                        break;
                    case "hash":
                        if(name != undefined){
                            redisDB.h(key).hdel(name, callbackFn);
                        } else {
                            redisDB.h(key).del(callbackFn);
                        }
                        break;
                    case "zset":
                        if(name != undefined){
                            redisDB.z(key).rem(name, callbackFn);
                        } else {
                            redisDB.z(key).del(callbackFn);
                        }
                        break;
                    default :
                        callbackFn(null);
                }
            });
        }
    }, function(err, res){
        response.echo("cache.del",{"result":1});
    });
}
exports.start = admin.adminAPIProxy(start);

