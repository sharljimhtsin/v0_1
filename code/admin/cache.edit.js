/**
 * cache.get
 * User: za
 * Date: 14-3-3
 * Time: 下午4:32
 */

var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var async = require("async");
var redis = require("../alien/db/redis");


function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["shop"], query["country"]) == false) {
        response.echo("cache.get", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData,"userUid","key") == false) {
        response.echo("cache.get", jutil.errorInfo("postError"));
        return;
    }
    var country = query["country"];
    var city = postData["city"];
    var key = postData["key"];
    var name = postData["name"];
    var value = postData["value"];
    var userUid = postData["userUid"];
    var keyType = postData["keyType"];

    var redisDB;
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
        default :
            redisDB = redis.user(userUid);
            break;
    }

    var type = "";
    async.series([
        function(cb){
            redisDB.k(key).type(function(err, res){
                type = res;
                cb(null);
            });
        },
        function(cb){
            switch (type){
                case "string":
                    redisDB.s(key).set(value, function(err, res){
                        cb(null);
                    });
                    break;
                case "hash":
                    redisDB.h(key).set(name, value, function(err, res){
                        cb(null);
                    });
                    break;
                case "zset":
                    redisDB.z(key).add(value, name, function(err, res){
                        cb(null);
                    });
                    break;
                default :
                    cb(null);
            }
        }
    ], function(err, res){
        response.echo("cache.edit",{"status":1});
    });
}
exports.start = admin.adminAPIProxy(start);