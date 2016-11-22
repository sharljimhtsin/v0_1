/**
 * User: liyuluan
 * Date: 14-2-8
 * Time: 下午2:59
 */

var httpClient = require("./httpClient");


function arrayAve(array) {
    var sum = 0;
    for (var i = 0; i < array.length; i++) {
        sum += array[i];
    }
    return sum / array.length;
}

function ApiPost(configData) {
    this._configData = configData;
}

ApiPost.prototype.post = function(methodName, handler, count, logCallback) {
    var mCount = 1;
    var errList = [];//错误列表
    var runCount = 0;//已调用次数
    var sCount = 0;//成功次数
    var eCount = 0;//失败次数
    var maxTime = 0;//最长时间
    var minTime = 90000000;//最短时间
    var aveTimes = [];//时间列表


    if (count == null || count == 0) mCount = 1;
    else mCount = count;

    for (var i = 0; i < mCount; i++) {
        httpClient.fcRequest(this._configData, methodName,{}, function(err,res) {
            handler(err, res, function(log) {
                if (log["err"] != null) {
                    errList.push(log["err"]);
                    eCount++;
                } else {
                    sCount++;
                }
                if (log.time > maxTime) maxTime = log.time;
                if (log.time < minTime) minTime = log.time;
                aveTimes.push(log.time);
                runCount++;
//                console.log("Time:" + log.time);
                if (runCount >= mCount) {
                    logCallback({"errList":errList,
                        "success":sCount,
                        "failure":eCount,
                        "minTime":minTime,
                        "maxTime":maxTime,
                        "aveTime":arrayAve(aveTimes)
                    });
//                    console.log(aveTimes);
                }
            });
        });
    }
}


ApiPost.prototype.defaultHandler = function(err, res, postCb) {
    var mLog = {};
    if (err == null) {
        mLog["err"] = err;
    } else if (res["statusCode"] != 200) {
        mLog["err"] = res["statusCode"];
    } else {
        mLog["err"] = null;
    }
    mLog.time = res["time"];
    postCb(mLog);
}

exports.ApiPost = ApiPost;

