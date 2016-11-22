/**
 * 用户在线统计处理
 * User: liyuluan
 * Date: 14-2-21
 * Time: 下午5:31
 */
var redis = require("../db/redis");
var jutil = require("../../utils/jutil");

var _onOffineCallbackFn = {}; //保存离线回调函数
//var _offineList = [];
var nowTime = jutil.nowMillisecond();

//心跳处理
function heartbeat(userUid) {
    var mNow = jutil.nowMillisecond();
    if (userUid == "null" || userUid-0 < 1000)  {
        console.error("无效的userUid:.", userUid);
        return;
    }
    var redis_domain = redis.domain(userUid);
    if(redis_domain != null){
        redis_domain.z("uOnline").add(mNow, userUid, function(err, res) {
            if (err != null) {
                //错误不处理
            } else {
                if (res == 1) { //如果这个玩家是刚上线，则记录上线的时间
                    redis.domain(userUid).h("uLogin").set(userUid, mNow);
                    var pushCron = require("../../model/pushCron");
                    pushCron.online(userUid);
                }
                offline(userUid, function(err, res) {
                    if (err) console.error(err.stack);
                    else if(res == null) return;
                    else {
                        if(res.length > 0) {
                            for(var i in _onOffineCallbackFn){
                                _onOffineCallbackFn[i](res);
                            }
                        }
                    }
                });
            }
        });
    }
}

var OFFLINE_TIME = 15 * 60 * 1000;

//触发离线处理， userUid用于判定当前分区的离线处理。 返回数组[登录时间， 离线时间]
function offline(userUid, callbackFn) {
    var mNow = jutil.nowMillisecond();
    if(mNow - nowTime < 2000){
        callbackFn(null, null);
        return ;
    }
    nowTime = mNow;
    var offlineTime = mNow - OFFLINE_TIME; //多久前的被判断为离线
    redis.domain(userUid).z("uOnline").remGetRangeByScore(0, offlineTime, function(err, res) { //将离线的人删除并返回
        if (err) callbackFn(err);
        else {
            var lastTimeArr = res;
            var lastTimeObj = {};
            var offlineArray = [];
            for (var i = 0; i < lastTimeArr.length; i+= 2) {
                lastTimeObj[lastTimeArr[i]] = lastTimeArr[i+1];
                offlineArray.push(lastTimeArr[i]);
            }

            if (offlineArray != null && offlineArray.length > 0) {
                redis.domain(userUid).h("uLogin").mRemGet(offlineArray, function(err, res) { //取出离线的人的userUid, 并删除
                    callbackFn(null, [res, lastTimeObj]);
                });
            } else {
                callbackFn(null, null);
            }
        }
    });
}

//当前在线人数
function currentOnline(userUid, callbackFn) {
    var mTime = Math.floor(jutil.nowMillisecond() / 1000 / 60 / 5);
    var mRedis = redis.domain(userUid);
    if (mRedis == null){
        callbackFn("Redis null", -1);
        return;
    }

    mRedis.s("uOnlineT:" + mTime).exists(function(err, res) {
        if (res == 0) {
            redis.domain(userUid).z("uOnline").count(0, 2148566400000, function(err ,res) {
                redis.domain(userUid).s("uOnlineT:" + mTime).setex(86400, res, function() {});
                callbackFn(err, res);
            });
        } else {
            callbackFn(err, -1);
        }
    });
}



//监听离线处理
function onOffine(name, callbackFn) {
    _onOffineCallbackFn[name] = callbackFn;
}


exports.heartbeat = heartbeat;
exports.offline = offline;
exports.onOffine = onOffine;
exports.currentOnline = currentOnline;