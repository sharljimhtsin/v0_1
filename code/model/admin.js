/**
 * 管理员帐号系统
 * User: liyuluan
 * Date: 14-1-28
 * Time: 下午6:12
 */

var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");
var crypto = require("crypto");
var user  = require("../model/user")
var jutil = require("../utils/jutil");
var rechargeRanking = require("../model/rechargeRanking");//充值排行
var consumeRanking = require("../model/consumeRanking");//消费排行
var cosmosEvaluation = require("../model/cosmosEvaluation");//宇宙第一排行
var cosmosLeague = require("../model/cosmosLeague");//宇宙第一联盟排行
var leagueDragon = require("../model/leagueDragon");//联盟战信息（联盟龙model）
var bitUtil = require("../alien/db/bitUtil");
//检查用户是否有效
function checkUser(country, uid, pw, callbackFn) {
    var sql = "SELECT * FROM user WHERE uid=" + mysql.escape(uid) + " AND password=" + mysql.escape(md5(pw)) + " LIMIT 1";

    var mdb =  mysql.adminDB(country);
    if (mdb == null) {
        callbackFn("noDB", false);
        return;
    }

    mdb.query(sql, function(err, res) {
        if (err || res == null || res.length == 0) {
            callbackFn("noUser", false);
        } else {
            callbackFn(null, true);
        }
    });
}


function loginCheck(name, password, country, callbackFn) {
    var sql = "SELECT * FROM user WHERE name=" + mysql.escape(name) + " AND password=" + mysql.escape(md5(password)) + " LIMIT 1";
    var mdb =  mysql.adminDB(country);
    if (mdb == null) {
        callbackFn("noDB", false);
        return;
    }
    mdb.query(sql, function(err, res) {
        if (err) {
            console.log(sql, err);
        }
        if (err || res == null || res.length == 0) callbackFn("noUser", null);
        else {
            callbackFn(null, {"userData":res[0]});
        }
    });
}

//取得一个用的权限
function getAuth(country, uid, callbackFn) {
    var sql = "SELECT `authorize`, `group`, `channel` FROM user WHERE uid=" + mysql.escape(uid) + " LIMIT 1";
    var mdb =  mysql.adminDB(country);
    mdb.query(sql, function(err, res) {
        if (err || res == null || res.length == 0) callbackFn(err, null);
        else {
            var authorize = res[0]["authorize"];
            var group = res[0]["group"];
            var channel = res[0]["channel"];
            var authorizeSql = "SELECT * FROM authorize WHERE id=" + mysql.escape(authorize) + " LIMIT 1";
            mdb.query(authorizeSql, function(err, res) {
                if (err || res == null || res.length == 0) callbackFn(err, null);
                else {
                    var returnObj = {};
                    for (var key in res[0]) {
                        returnObj[key] = res[0][key];
                    }
                    returnObj["group"] = group;
                    returnObj["channel"] = channel;
                    callbackFn(null,returnObj);
                }
            });
        }
    });
}
/**
 * 创建修改一个用户的权限
 * @param country
 * @param authorize
 */
function addAdminCompetence(country,authorize,callbackFn){
    delete authorize['id'];
    var whereSql = "uid=" + mysql.escape(authorize['uid']);
    var mdb =  mysql.adminDB(country);
    var updateSql = "UPDATE adminAuthorize SET ? WHERE " + whereSql;
    mdb.query(updateSql,authorize,function(err, res) {
        if(res==null || res["affectedRows"] == 0){
            var insertSql = "INSERT INTO adminAuthorize SET ?";
            mdb.query(insertSql,authorize,function(err,res){
                callbackFn(err,res);
            });
        }else{
            callbackFn(err,res);
        }
    });
//    mysql.dataIsExist(authorize["id"],"authorize",whereSql,function(err, res) {
//        if (res == 0) {
//            var insertSql = "INSERT INTO authorize SET ?";
//            newValueData = authorize;
//            mdb.query(insertSql,newValueData,function(err,res){
//                callbackFn(err,res);
//            });
//        } else {
//            var updateSql = "UPDATE authorize SET ? WHERE " + whereSql;
//            mdb.query(updateSql,newValueData,function(err, res) {
//                callbackFn(err,res);
//            });
//        }
//    });
}
/**
 *获取一个组的权限
 */
function getGroupCompetence(country,authorize,callbackFn){
    var mdb =  mysql.adminDB(country);
    var authorizeSql = "SELECT * FROM authorize WHERE id=" + mysql.escape(authorize) + " LIMIT 1";
    mdb.query(authorizeSql, function(err, res) {
        if (err || res == null || res.length == 0) callbackFn(err, null);
        else {
            var returnObj = {};
            for (var key in res[0]) {
                returnObj[key] = res[0][key];
            }
            callbackFn(null,returnObj);
        }
    });
}
/**
 * admin接口代理函数。adminAPIProxy会将当前用户的权限加到api 的入口
 * @param fn
 */
function adminAPIProxy(fn) {
    var _fn = fn;
    return function(postData, response, query) {
        var uid = query["uid"];
        var country = query["country"];
        getUserInfo(country, uid, function(err, res) {
            _fn(postData, response, query, res);
        });
    }
}

/**
 * 检查是否有对应的权限
 * @param auth 当前用户拥有的权限表
 * @param authList 为要检测的权限列表
 * @param [group] 要检测是否属于对应组的(即大区)
 * @param [channel] 要检测是否属于对应通道的
 * @returns {boolean}
 */
function checkAuth(auth, authList, group, channel) {
    if (auth == null) return false;

    for (var i = 0; i < authList.length; i++) {
        var name = authList[i];
        if (auth[name] == null || auth[name] == 0) return false;
    }

    if (group != null && auth["group"] != "all" && auth["group"] != group) return false;
    if (channel != null && auth["channel"] != "all" && auth["channel"] != channel) return false;

    return true;
}

function getCountryCityList(country) {
    var gameConfigPath = "../../config/";
    var mServerList = require(gameConfigPath + country + "_server.json")["serverList"];
    var cityList = Object.keys(mServerList);
    return cityList;
}


//取商店用户列表
function getShopList(country, callbackFn) {
    var sql = "SELECT * FROM shop";
    mysql.loginDB(country).query(sql, function(err, res) {
        if (err) callbackFn(err, null);
        else {
            var list = res || [];
            //var listStr = "[]";
            //try {
            //    listStr = JSON.stringify(list);
            //} catch(error) {
            //    console.error(error.stack);
            //}
            callbackFn(null, list);
        }//if
    });//mysql
}

//添加物品到商店
function addShop(country, data, callbackFn) {
    var sql = "INSERT INTO shop SET ?";
    mysql.loginDB(country).query(sql, data, function(err, res) {
        if (err) callbackFn(err, null);
        else {
            getShopList(country, callbackFn);
        }
    });
}
/**
 * 创建用户
 * @param userName
 * @param passWord
 * @param callBackFun
 */
function createUser(country,userData,callBackFun){
    var sql = "INSERT INTO user SET ?";
    mysql.adminDB(country).query(sql, userData, function(err, res) {
        if (err) callBackFun(err, res);
        else {
            callBackFun(null, res);
        }
    });
}
function updateUser(country,userData,uid,callBackFun){
    var sql = "UPDATE user SET ? WHERE `uid`=" + uid;
    mysql.adminDB(country).query(sql, userData, function(err, res) {
        if (err) callBackFun(err, null);
        else {
            callBackFun(null, null);
        }
    });
}
/**
 * 删除一条数据
 */
function deleteAdmin(country,uid,cb){
    var sql = "DELETE FROM user WHERE uid=" + uid;
    mysql.adminDB(country).query(sql, function(err, res) {
        if (err) cb(err, null);
        else {
            cb(null, null);
        }
    });
}
//更新物品
function updateShop(country, shopUid, data, callbackFn) {
    var sql = "UPDATE shop SET ? WHERE `shopUid`=" + mysql.escape(shopUid);
    mysql.loginDB(country).query(sql, data, function(err, res) {
        if (err) callbackFn(err, null);
        else {
            getShopList(country, callbackFn);
        }
    });
}

//用户补偿数据添加
function addCompensate(country, compensateData, callbackFn) {
    var sql = "INSERT INTO compensate SET ?";
    mysql.loginDB(country).query(sql, compensateData, function (err, res){
        if (err) callbackFn(err, null);
        else {
            getCompensate(country, callbackFn);
        }
    });
}

//删除一个用户的补偿
function delCompensate(country, compensateId, callbackFn) {
    var sql = "DELETE FROM compensate WHERE id=" + compensateId;
    mysql.loginDB(country).query(sql, function(err, res) {
        if (err) callbackFn(err, null);
        else {
            getCompensate(country, callbackFn);
        }
    });
}

//取用户补偿列表
function getCompensate(country, callbackFn) {
    var sql = "SELECT * FROM compensate";
    mysql.loginDB(country).query(sql, function(err, res) {
        if (err) callbackFn(err, null);
        else {
            callbackFn(null, res);
        }
    });
}



function delCache(country, key) {
    var mConfig = null;
    try {
        mConfig = require("../../config/" + country + "_server.json");
    } catch (error) {

    }
    if (mConfig != null) {
        var mServerList = mConfig["serverList"];
        if (mServerList == null) return null;
        for (var city in mServerList) {
            redis.domain(country, city).s(key).del();
        }
    }
}
function getAdminList(country,callbackFn){
    var sql = "SELECT * FROM user";
    mysql.adminDB(country).query(sql, function(err, res) {
        if (err) callbackFn(err, null);
        else {
            var list = res || [];
            var listStr = "[]";
            try {
                listStr = JSON.stringify(list);
            } catch(error) {
                console.error(error.stack);
            }
            callbackFn(null, JSON.parse(listStr));
        }//if
    });
}




function md5(text) {
    var t = text || "";
    t = t + "!NB4m";
    var md5Text = crypto.createHash("md5").update(t).digest("hex");
    return crypto.createHash("md5").update(md5Text).digest("hex");
}
/**
 * 添加一条数据操作到数据库
 * @param userName
 * @param model
 * @param action
 */
function addLogToDb(country,insertData,cb){
    var sqlStr = "INSERT INTO operationLog SET ?"
    mysql.adminDB(country).query(sqlStr, insertData, function (err, res){
        if (err) {
            console.log(err);
            cb(err, null);
        }
        else {
            cb(null,res);
        }
    });
}
//添加一个日志
function addOneOperationLog(model,query,postData){
    var country = query["country"];
    var postStr = postData == null ? "" : JSON.stringify(postData);
    var uid = query["uid"] != null ? query["uid"] : "";
    var insertData = {};
    if(uid == ""){
        return;
    }
    getUserInfo(country,uid,function(err,res){
        if(err) console.log("admin",err);
        else{
            insertData["userName"] = res["name"];
            insertData["model"] = model;// + ":" + query["method"];
            insertData["action"] = "method = " + query["method"] + ":country = " + query["country"] + ":postData = " +postStr;
            insertData["time"] = jutil.now();
            addLogToDb(country,insertData,function(err,res){
                if(err) console.log("admin",err);
            });
        }
    });
}
function searchOperationLog(county,userName,model,startTime,endTime,cb){
    var sqlStr = "SELECT * FROM operationLog WHERE time >= " + mysql.escape(startTime) + " AND time <= " + mysql.escape(endTime);
    sqlStr = userName == '' ? sqlStr : sqlStr + " AND userName=" + mysql.escape(userName);
    sqlStr = model == '1' ? sqlStr : sqlStr + " AND model=" + mysql.escape(model);
    mysql.adminDB(county).query(sqlStr,function(err,res){
        if(err)cb(err,null);
        else{
            var list = res || [];
            var listStr = "[]";
            try {
                listStr = JSON.stringify(list);
            } catch(error) {
                console.error(error.stack);
            }
            cb(null, JSON.parse(listStr));
        }
    });
}
function getUserInfo(county,uid,cb){
    var sqlStr = "SELECT * FROM user WHERE uid =" + uid;
    mysql.adminDB(county).query(sqlStr,function(err,res){
        if(err || res == null)cb("noThisUser",null);
        else{
            cb(null,res[0]);
        }
    });
}

//取玩家的等级排行榜
function getLevelRanking(county, city, day, cb) {
    var redisDB = redis.domain(county, city);
    if (redisDB == null) {
        cb(null, {});
        return;
    }
    redis.domain(county, city).s("dayRanking:" + day).getObj(cb);
}

//取玩家联盟星球战信息
function getLeagueStarInfo(country, city, callbackFn) {
    var userUid = bitUtil.createUserUid(country, city, 0);
    var retData = [];
    leagueDragon.getStars(userUid,function(err,res){
//        console.log(res,"admin..");
        for(var i in res){
            retData.push({"starId":res[i]["starId"],"leagueUid":res[i]["leagueUid"],"hasTime":res[i]["hasTime"]});
        }
        callbackFn(err, retData);
    });
}



//取玩家激战排行榜
function getPvpRanking(county, city, day, cb) {
    var redisDB = redis.domain(county, city);
    if (redisDB == null) {
        cb(null, {});
        return;
    }
    redisDB.s("pvptop50:" + day).getObj(cb);
}
//取玩家封印排行榜
function getBloodyRanking(county, city, type, day, cb) {
    var redisDB = redis.dynamic(county, city);
    if (redisDB == null) {
        cb(null, {});
        return;
    }
    redisDB.z(type + ":" + day).revrange(0 ,19 ,"WITHSCORES",function(err, res){
        var returnData = [];
        for(var i = 0 ; i < res.length / 2  ; i ++){
            var obj = {};
            obj["top"] = i + 1;
            obj["value"] = res[i * 2 + 1];
            obj["userId"] = res[i * 2];
            returnData.push(obj);
        }
        cb(null, returnData);
    });
}

function analyticSearch(userUid, model, startTime, endTime, typeId, itemId, cb){
    var mongo = require('../alien/db/mongo');
    var mModel;
    var where = {userUid:userUid, time:{$gte:startTime*1000,$lte:endTime*1000}};
    if(typeId){
        where['typeId'] = typeId;
    }
    switch(model){
        case 'IngotExpend':
            break;
        case 'IngotReceive':
            break;
        case 'GoldGet':
            break;
        case 'GoldConsume':
            break;
        case 'ItemGet':
            if(itemId)
                where['itemId'] = itemId;
            break;
        case 'ItemConsume':
            if(itemId)
                where['itemId'] = itemId;
            break;
    }
}

function getVariableTime(userUid, callbackFn){
    redis.user(userUid).h("variable").getObj(function(err, res) {
        if (err) callbackFn(err,null);
        else if(res == null) {
            var sql = "SELECT * FROM variable WHERE userUid=" + mysql.escape(userUid);
            mysql.game(userUid).query(sql,function(err,res) {
                if (err) {
                    callbackFn(err,null);
                } else if (res == null || res.length == 0) {
                    callbackFn(null, null);
                } else {
                    var data = [];
                    var rdata = {};
                    for(var i in res){
                        rdata[res[i]["name"]] = res[i]["value"] + "|" + res[i]["time"];
                        data.push({"name":res[i]["name"],"value":res[i]["value"],"time":res[i]["time"]});
                    }
                    redis.user(userUid).h("variable").setObj(rdata);
//                    redis.game(userUid).getClient().hset("variable:" + userUid, name, mRes["value"] + "|" + mRes["time"]);
                    callbackFn(null,data);
                }
            });
        } else {
            var data = [];
            for(var i in res){
                var mArr = res[i].split("|");
                if (mArr.length <= 1) mArr[1] = 0;
                data.push({"name":i,"value":mArr[0],"time":mArr[1]});
            }
            callbackFn(null,data);
        }
    });
}
//充值排行
function getRechargeRanking(country, city, key,callbackFn){
    var userUid = bitUtil.createUserUid(country, city, 0);
    var retData = [];
    rechargeRanking.getTopList(userUid,key,0,function(err, res){
        for(var i in res){
            retData.push({"userUid":res[i]["userUid"],"value":res[i]["number"],"top":(i-0+1) +""});
        }
        callbackFn(err, retData);
    });
}
//消费排行
function getConsumeRanking(country, city, key,callbackFn){
    var userUid = bitUtil.createUserUid(country, city, 0);
    var retData = [];
    consumeRanking.getTopList(userUid,key,0,function(err, res){
        for(var i in res){
            retData.push({"userUid":res[i]["userUid"],"value":res[i]["number"],"top":(i-0+1) +""});
        }
        callbackFn(err, retData);
    });
}
//宇宙第一排行
function getCosmosEvaluation(country, city, key,callbackFn){
    var userUid = bitUtil.createUserUid(country, city, 0);
    var retData = [];
    cosmosEvaluation.getTopList(userUid,key,0,"24",function(err, res){
        for(var i in res){
            retData.push({"userUid":res[i]["userUid"],"value":res[i]["number"],"top":(i-0+1) +""});
        }
        callbackFn(err, retData);
    });
}
//宇宙联盟排行
function getCosmosLeague(country, city, key,callbackFn){
    var userUid = bitUtil.createUserUid(country, city, 0);
    var retData = [];
    cosmosLeague.getTopList(userUid,key,0,"24",function(err, res){
        for(var i in res){
            retData.push({"userUid":res[i]["leagueUid"].substr(0, res[i].length-5),"value":res[i]["number"],"top":(i-0+1) +""});
        }
        callbackFn(err, retData);
    });
}
exports.addOneOperationLog = addOneOperationLog;
exports.searchOperationLog = searchOperationLog;
exports.checkUser = checkUser;
exports.getAuth = getAuth;
exports.adminAPIProxy = adminAPIProxy;
exports.checkAuth = checkAuth;
exports.loginCheck = loginCheck;
exports.getCountryCityList = getCountryCityList;
exports.getShopList = getShopList;
exports.addShop = addShop;
exports.updateShop = updateShop;
exports.delCache = delCache;
exports.getAdminList = getAdminList;
exports.getUserInfo = getUserInfo;

exports.getLevelRanking = getLevelRanking;
exports.getPvpRanking = getPvpRanking;
exports.getBloodyRanking = getBloodyRanking;
exports.getLeagueStarInfo = getLeagueStarInfo;

exports.getCompensate = getCompensate;
exports.addCompensate = addCompensate;
exports.delCompensate = delCompensate;
exports.getGroupCompetence = getGroupCompetence;
exports.addAdminCompetence = addAdminCompetence;
exports.createUser = createUser;
exports.updateUser = updateUser;
exports.md5 = md5;
exports.deleteAdmin = deleteAdmin;
exports.getVariableTime = getVariableTime;
exports.analyticSearch = analyticSearch;
exports.AUTH_ERROR = {"ERROR":"AUTH_ERROR","info":"没有调用权限"};
exports.getRechargeRanking = getRechargeRanking;//充值排行榜
exports.getConsumeRanking = getConsumeRanking;//消费排行榜
exports.getCosmosEvaluation = getCosmosEvaluation;//宇宙第一排行榜
exports.getCosmosLeague = getCosmosLeague;//宇宙第一联盟排行榜