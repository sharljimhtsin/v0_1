/**
 * 用户token处理
 * User: liyuluan
 * Date: 13-10-10
 * Time: 下午5:00
 */

var redis = require("../alien/db/redis");
var jutil = require("../utils/jutil");

var TOKEN_TIME = 60 * 60 * 24 * 3;// token过期时间

/**
 * 取一个token值
 * @param userUid
 * @param callbackFn
 */
function getToken(userUid,callbackFn) {
    var token = jutil.randomString();
    redis.user(userUid).s("token").set(token, function (err, res) {
        if (err) {
            callbackFn(err,null);
        } else {
            callbackFn(null,token);
        }
    });
    redis.user(userUid).s("token").expire(TOKEN_TIME);



//    redis.user(userUid).s("token").get(function(err, res) {
//        if (res == null) {
//            var token = jutil.randomString();
//            redis.user(userUid).s("token").set(token, function(err,res) {
//                if (err) {
//                    callbackFn(err,null);
//                } else {
//                    callbackFn(null,token);
//                }
//            });
//            redis.user(userUid).s("token").expire(TOKEN_TIME);
//        } else {
//            callbackFn(null,res);
//        }
//    });
}


function checkToken(userUid,token,callbackFn) {
//    redis.game(userUid).getClient().get("token:" + userUid,function(err,res) {
    redis.user(userUid).s("token").get(function (err, res) {
        if (err) {
            callbackFn(err,null);
        } else if (token != res) {
            callbackFn("ERROR",null);
        } else {
            callbackFn(null,true);
        }
    });
}


exports.getToken = getToken;
exports.checkToken = checkToken;