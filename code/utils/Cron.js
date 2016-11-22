/**
 * User: liyuluan
 * Date: 14-2-27
 * Time: 上午2:05
 */
var jutil = require("./jutil");
var redis = require("../alien/db/redis");
var async = require("async");

var timeDic = [];
var timeCallback = {};
var compDay = {};
var mCountry = [];
var isRun = false;

/**
 * 添加一个定时器
 * @param hour 每天的哪个小时
 * @param minute 每天的哪个分钟
 * @param callbackFn
 */
function addCron(hour, minute, callbackFn) {
//    timeDic[];
    var key = hour + ":" + minute;
    if (timeDic.indexOf(key) == -1) {
        timeDic.push(key);
        timeCallback[key] = [];
    } else {
        console.log("这个定时器已创建！");
    }
    timeCallback[key].push(callbackFn);
}

var intervalTime = 1000 * 1; //五分钟执行一次

var intervalFun = function() {
    if(isRun)return;
    //console.log(timeDic);
    async.eachSeries(mCountry, function(country, cb){
        async.eachSeries(timeDic, function(key, esCb){
            var i = 0;
            async.eachSeries(timeCallback[key], function(cronFn, esCcb){
                i++;
                var mCode = key.split(":");
                var mHour = mCode[0]-0;
                var mMinute = mCode[1]-0;
                var nm = Math.floor((jutil.now()-jutil.todayTime()) / 60);//当前当天分钟数
                var cm = mHour*60+mMinute;//任务当天分钟数
                var dayKey = country+":"+jutil.day()+":"+key+":"+i;
                if(!isRun && compDay[country+":"+key+":"+i] != dayKey && nm >= cm){//可以跑
                    compDay[country+":"+key+":"+i] = dayKey;//标记已跑过
                    console.log(country, "cronRun:"+jutil.day(), key, i, jutil.now());
                    isRun = true;
                    cronFn(country, mCode[0], mCode[1], function (err, res) {
                        isRun = false;
                        esCcb(null);
                    });
                } else {
                    esCcb(null);
                }
            }, esCb);
        }, cb);
    }, function(err, res){
        if(err)
            console.log("cron: one times, day:"+jutil.now(), err, res);
    });
}

function addSever(c) {
    for(var i in mCountry){
        if(mCountry[i]==c) return;
    }
    mCountry.push(c);
}

setInterval(intervalFun, intervalTime);
//setTimeout(intervalFun, 1000);



exports.addCron = addCron;
exports.addSever = addSever;
