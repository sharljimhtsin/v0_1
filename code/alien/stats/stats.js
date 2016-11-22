/**
 * Created with JetBrains WebStorm.
 * User: apple
 * Date: 13-7-31
 * Time: 下午2:06
 * To change this template use File | Settings | File Templates.
 */

var redis = require('redis');


var client;
var isReady = false;//是否准备完毕的
var sTime;

var oneDay = 60 * 60 * 60 * 24 * 1000;//一天的毫秒值

var s_login = "s_l:";//每个玩家的登录bitmap
var s_newList = "s_nl:";//每天新玩家的列表

var s_active = "s_active";//每天活跃数
var s_new = "s_new";//每天新用户数
var s_newHours = "s_new:";//每小时活跃数
var s_Retention = "s_r:";//留存
var s_hoursActive = "s_ha:";//小时的活跃分布



/**
 * 初始化统计的库，选择所使用的数据库
 * @param port
 * @param host
 * @param db
 * @param [startTime] 开始时间,1970年毫秒
 */
function initStats(port,host,db,startTime) {

    client = redis.createClient(port,host);
    client.on("error",function(err){
        console.error( err.stack );
    });

    client.select(db,function(err,res){
        isReady = true;
    });

    if (startTime == null) {
        sTime = new Date(2013,6,31).getTime();//时间无意义
    } else {
        sTime = startTime;
    }
}


////============添加统计数据========================================

/**
 * 玩家登录
 * @param userId
 * @param [isNew] 是否是新用户
 */
function login(userId,isNew) {
    if (!isReady) return;
    var mDay = _getDay();
    var mkey = s_login + userId;
    hoursActive();
    client.getbit(mkey,mDay,function(err,res){
        if (res === 0) {
            client.setbit(mkey,mDay,1,_defaultCallBack);//将玩家的某天设为上线的
            client.hincrby(s_active,mDay,1,_defaultCallBack);//将某天的活跃数加1
            if (isNew === true || isNew === 1) {
                client.hincrby(s_new,mDay,1,_defaultCallBack);//将某天的新用户数加1
                var hours = _getHours();
                client.hincrby(s_newHours + mDay,hours,1,_defaultCallBack);//将某天中的某个时段的新用户数加1
//                client.hset("s_rtime",userId,mDay,_defaultCallBack);//记录一个玩家的注册时间
                client.sadd(s_newList + mDay,userId,_defaultCallBack);//记录今天的登录的玩家列表
            }
        }
    });
}

/**
 * 设置每天活跃的小时分布
 */
function hoursActive() {
    if (!isReady) return;
    var mDay = _getDay();
    var mHours = _getHours();

    client.hincrby(s_hoursActive + mDay,mHours,1,_defaultCallBack);

}

///==========获取相关数据===================================






/**
 * 获得某天的活跃用户数
 * @param aDay
 * @param callbackFn
 */
function getActive(aTime,callbackFn) {
    if (!isReady) callbackFn(null,-1);
    var aDay = _getCurrentDay(aTime);
    client.hget(s_active,aDay,callbackFn);
}

/**
 * 获得某天的新注册用户数
 * @param aDay
 * @param callbackFn
 */
function getNewUserCount(aTime,callbackFn) {
    if (!isReady) callbackFn(null,-1);
    var aDay = _getCurrentDay(aTime);
    client.hget(s_new,aDay,callbackFn);
}


/**
 * 获得某天玩家的 n 日留存数
 * @param aTime
 * @param day
 * @param callbackFn
 */
function getRetention(aTime,day,callbackFn) {
    if (!isReady) callbackFn(null,-1);
    var aDay = _getCurrentDay(aTime);
    client.hget(s_Retention + aDay,day,function(err,res) {
        if (res != null) {
            callbackFn(null,res);
        } else {
            var mDay = aDay + (day - 1);//取得要计算的留存的天数的取值
            if (mDay >= _getDay()) {
                callbackFn(null,0);//今天和超过今天的忽略计算
                return;
            }
            client.smembers(s_newList + aDay,function(err,res) {
                if (res == null) {
                    callbackFn(null,0);
                } else {
                    var retentionCount = 0;
                    _forEach(res,function(item,callback) {
                        client.getbit(s_login + item,mDay,function(err,res) {
                            if (res === 1) {
                                retentionCount += 1;
                            }
                        });
                    },function(err){
                        client.hset(s_Retention + aDay,day,retentionCount,_defaultCallBack);
                        callbackFn(null,retentionCount);
                    });
                }
            });
        }
    });
}

/**
 * 获得某一天的新用户分布
 * @param aTime
 * @param callbackFn
 */
function getNewHours(aTime,callbackFn) {
    if (!isReady) callbackFn(null, null);
    var aDay = _getCurrentDay(aTime);
    client.hgetall(s_newHours + aDay, callbackFn);
}


/**
 * 取得某天的用户活跃分布
 * @param aTime
 * @param callbackFn
 */
function getHoursActive(aTime,callbackFn) {
    if (!isReady) callbackFn(null, null);
    var aDay = _getCurrentDay(aTime);
    client.hgetall(s_hoursActive + aDay, callbackFn);

}



//utils======= utils======= utils======= utils======= utils
/**
 * 返回开始时间到当前的天数
 * @private
 */
function _getDay() {
    return Math.floor((Date.now() - sTime)/oneDay);
}

//返回当前的小时数
function _getHours() {
    return new Date().getHours();
}


//返回一个时间的应有天数
function _getCurrentDay(date) {
    var mTime;
    if (typeof date === "number") {
        mTime = date;
    } else if (typeof date["getTime"] === "function") {
        mTime = date.getTime();
    } else {
        mTime = Date.now();
    }
    return Math.floor((mTime - sTime)/oneDay);
}

//循环列表
function _forEach(arr,iterator,callback) {
    if (arr == null || arr.length == 0) callback();
    var completed = 0;
    for (var i = 0; i < arr.length; i++) {
        iterator(arr[i],function(err) {
            completed += 1;
            if (completed >= arr.length) {
                callback();
            }
        });
    }
}


//空回调函数
function _defaultCallBack(err,res) {

}





exports.initStats = initStats;
exports.login = login;

exports.getActive = getActive;
exports.getNewUserCount = getNewUserCount;
exports.getRetention = getRetention;
exports.getNewHours = getNewHours;
exports.getHoursActive = getHoursActive;
