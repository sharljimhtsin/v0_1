/**
 * Created with JetBrains WebStorm.
 * User: luoxiaobin
 * Date: 14-5-23
 * Time: 下午2:56
 * To change this template use File | Settings | File Templates.
 */

var title = require("../model/titleModel");
var userVariable = require("../model/userVariable");
var configManager = require("../config/configManager");
var teach = require("../model/teach");
var user = require("../model/user");
var jutil = require("../utils/jutil");
var async = require("async");
var redis = require("../alien/db/redis");
var activityConfig = require("../model/activityConfig");
var itemModel = require("../model/item");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");



exports.start = function(postData, response, query){
    //action: get/getNew/getUpdate
    if (jutil.postCheck(postData, "action","category") == false) {
        response.echo("title.get", jutil.errorInfo("postError"));
        return false;
    }
    var userUid = query["userUid"];
    var action = postData['action'];
    var category = postData["category"];


    switch (action) {

        case "get":
            __get(userUid, function(err, res){
                if (err) {
                    response.echo("title.get",  jutil.errorInfo(err));
                } else {
                    response.echo("title.get", res);
                }
            });
            break;

        case "getNew":
            __getNew(userUid, category, function(err, res){
                if (err) {
                    response.echo("title.get",  jutil.errorInfo(err));
                } else {
                    response.echo("title.get", res);
                }
            });
            break;

        case "getUpdate":
            __getUpdate(userUid, category, function(err, res){
                if (err) {
                    response.echo("title.get",  jutil.errorInfo(err));
                } else {
                    response.echo("title.get", res);
                }
            });
            break;

        default :
            response.echo("title.get",  jutil.errorInfo("postError"));
            return false;
    }
};

/**
 * 获取升级和新称号数据
 * @param userUid
 * @param category
 * @param callbackFn
 */
exports.getNewAndUpdate = function(userUid, category, callbackFn) {
    var gRes = {};
    __getNew(userUid, category, function(err, res){
        if (!err && res) {
            gRes["newTitleInfo"] = res;
        }

        __getUpdate(userUid, category, function(err, res){
            if (!err && res) {
                gRes["updateTitleInfo"] = res;
            }

            callbackFn(null, gRes);
        });
    });
};


/**
 * 获取称号数据
 * @param userUid
 * @param callbackFn
 * @private
 */
function __get(userUid, callbackFn) {

    var gRes = {};

    async.series([
        // 获取称号数据
        function(cb) {
            title.getAllTitle(userUid, function(err, res){
                if (err) cb(err);
                else {
                    var titleInfoMap = {};

                    // 数组转MAP
                    for (var key in res) {
                        if (res.hasOwnProperty(key)) {
                            var titleInfo = res[key];
                            titleInfoMap[titleInfo["titleId"]] = titleInfo;
                        }
                    }

                    gRes["titleInfoMap"] = titleInfoMap;
                    cb(null);
                }
            });
        },
        // 获取加成数据
        function(cb) {
            title.getTitlesPoint(userUid, function(point){
                gRes["titlePoints"] = point;
                cb(null);
            });
        }
    ], function(err){
        if (err) callbackFn(err);
        else {
            callbackFn(null, gRes);
        }
    });
}

/**
 * 获取新获得的称号
 * @param userUid
 * @param category
 * @param callbackFn
 * @private
 */
function __getNew(userUid, category, callbackFn) {
    title.getNewTitle(userUid, function(err, res){
        if (err || res == null) {
            callbackFn(null, null);
        } else {
            var titleInfoMap = {};

            res = __filterByCategory(res, category);

            // 数组转MAP
            for (var key in res) {
                if (res.hasOwnProperty(key)) {
                    var titleInfo = res[key];
                    titleInfoMap[titleInfo["titleId"]] = titleInfo;
                }
            }

            callbackFn(null, titleInfoMap);
        }
    });
}

/**
 * 获取升级的称号
 * @param userUid
 * @param category
 * @param callbackFn
 * @private
 */
function __getUpdate(userUid, category, callbackFn){
    title.getUpdateTitle(userUid, function(err, res){
        if (err || res == null) {
            callbackFn(null, null);
        } else {

            var gRes = [];
            for (var key in res) {
                if (res.hasOwnProperty(key)) {
                    var info = res[key];
                    info["oldPoint"] = 100;
                    info["newPoint"] = 200;
                    gRes.push(info);
                }
            }

            gRes = __filterByCategory(gRes, category);

            callbackFn(null, gRes);
        }
    });
}

function __filterByCategory(arr, category){
    var rtnArr = [];
    for (var key in arr) {
        if (arr.hasOwnProperty(key)) {
            var item = arr[key];
            var titleId = item["titleId"];
            switch (category) {
                case "map":
                    if (titleId == 210001) {
                        rtnArr.push(item);
                    }
                    break;
                case "arena":
                    if (titleId == 210002) {
                        rtnArr.push(item);
                    }
                    break;
                case "friend":
                    if (titleId == 210015) {
                        rtnArr.push(item);
                    }
                    break;
                case "debris":
                    if (titleId == 210004) {
                        rtnArr.push(item);
                    }
                    break;
                case "boss":
                    switch (titleId) {
                        case 210013:
                        case 210016:
                        case 210017:
                        case 210018:
                        case 210019:
                        case 210020:
                        case 210021:
                            rtnArr.push(item);
                            break;
                    }
                    break;
                case "cosmos":
                    switch (titleId) {
                        case 210022:
                        case 210023:
                        case 210024:
                        case 210025:
                        case 210026:
                        case 210027:
                        case 210028:
                            rtnArr.push(item);
                            break;
                    }
                    break;
                case "bloodBattle":
                    switch (titleId) {
                        case 210005:
                        case 210006:
                        case 210007:
                        case 210008:
                        case 210009:
                        case 210010:
                        case 210011:
                        case 210012:
                            rtnArr.push(item);
                            break;
                    }
                    break;
                case "vip":
                    if (titleId == 210003) {
                        rtnArr.push(item);
                    }
                    break;
            }
        }
    }

    return rtnArr;
}