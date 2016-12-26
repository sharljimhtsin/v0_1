/**
 * Created with JetBrains WebStorm.
 * User: kongyajie
 * Date: 14-6-17
 * Time: 下午6:36
 * To change this template use File | Settings | File Templates.
 */


/**
 * 联盟的数据层
  * @type {*}
 */
var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");
var jutil = require("../utils/jutil");
var async = require("async");
var configManager = require("../config/configManager");

/**
 * 返回所有联盟
 * @param userUid
 * @param callbackFn
 */
function getLeagues(userUid,callbackFn){
    redis.domain(userUid).h("league").getAllJSON(function(err,res) {
        if (res == null) {
            var sql = "SELECT * FROM league";
            mysql.game(userUid).query(sql, function(err,res) {
                if (err || res == null || res.length <= 0) callbackFn(err,null);
                else {
                    var resultData = {};
                    for (var i = 0; i < res.length; i++ ) {
                        var mItem = res[i];
                        resultData[mItem["leagueUid"]] = mItem;
                    }
                    redis.domain(userUid).h("league").setAllJSON(resultData, function(err,res) {
                        callbackFn(null,resultData);
                    });
                }
            });
        } else {
            callbackFn(null,res);
        }
    });
}

/**
 * 返回某个联盟的数据
 * @param userUid
 * @param leagueUid
 * @param callbackFn
 */
function getLeague(userUid,leagueUid,callbackFn){
    getLeagues(userUid,function(err,res){
        if(err){
            callbackFn(err);
        }else{
            if(res == null){
                callbackFn(null,null);
            }else{
                var leagueData = res[leagueUid];
                callbackFn(null,leagueData == undefined?null:leagueData);
            }
        }
    })
}

/**
 * 新建一个联盟
 * @param userUid
 * @param leagueName
 * @param exp
 * @param type
 * @param notice
 * @param createTime
 * @param callbackFn
 */
function addLeague(userUid,leagueName,exp,type,costType,notice,createTime,callbackFn){
    var randomUid = jutil.nowMillisecond().toString() + Math.round(Math.random() * 1000);//随机一个uid，当前时间戳 + 3位随机数
    var leagueUid = randomUid - 0;
    var newLeagueData = {};
    newLeagueData["leagueUid"] = leagueUid;
    newLeagueData["founderUserUid"] = userUid;
    newLeagueData["leagueName"] = leagueName;
    newLeagueData["exp"] = exp;
    newLeagueData["type"] = type;
    newLeagueData["costType"] = costType;
    newLeagueData["notice"] = notice;
    newLeagueData["createTime"] = createTime;
    var sql = 'INSERT INTO league SET ?';
    mysql.game(userUid).query(sql,newLeagueData,function(err,res) {
        if (err) {
            callbackFn(err,null);
        } else {
            redis.domain(userUid).h("league").setJSON(leagueUid,newLeagueData,function(err,res){
                if(err){
                    callbackFn(err,null);
                }else{
                    callbackFn(null,newLeagueData);
                }
            });
        }
    });
}

/**
 * 更新联盟数据
 * @param userUid
 * @param leagueUid
 * @param leagueData
 * @param callbackFn
 */
function updateLeague(userUid,leagueUid,leagueData,callbackFn) {
    var sql = "UPDATE league SET ? WHERE leagueUid = " + mysql.escape(leagueUid);
    mysql.game(userUid).query(sql,leagueData,function(err,res){
        if (err) {
            callbackFn(err,null);
        } else {
            redis.domain(userUid).h("league").setJSON(leagueUid,leagueData,function(err,res){
                if(err){
                    callbackFn(err,null);
                }else{
                    callbackFn(null,1);//success
                }
            });
        }
    });
}

/**
 * 删除联盟
 * @param userUid
 * @param leagueUid 联盟uid
 * @param callbackFn
 */
function delLeague(userUid,leagueUid,callbackFn) {
    var sql = "DELETE FROM league WHERE leagueUid=?";
    mysql.game(userUid).query(sql,leagueUid,function(err,res) {
        redis.domain(userUid).h("league").hdel(leagueUid,function(err,res){
            if(err){
                callbackFn(err);
            }else{
                callbackFn(null,1);
            }
        });
    });
}

/**
 * 返回某个联盟的所有成员
 * @param userUid
 * @param leagueUid
 * @param callbackFn
 */
function getMembers(userUid,leagueUid,callbackFn){
    redis.domain(userUid).h("leagueMember" + leagueUid).getAllJSON(function(err,res) {
        if(res == null){
            var sql = "SELECT * FROM leagueMember WHERE leagueUid = " + mysql.escape(leagueUid);
            mysql.game(userUid).query(sql, function(err,res) {
                if (err){
                    callbackFn(err,null);
                } else if(res.length == 0) {
                    delLeague(userUid,leagueUid,function(err,res){
                        callbackFn(null, null);
                    });
                } else {
                    var members = {};//所有成员
                    for (var i = 0; i < res.length; i++ ) {
                        var mItem = res[i];
                        members[mItem["userUid"]] = mItem;
                    }
                    redis.domain(userUid).h("leagueMember" + leagueUid).setAllJSON(members,function(err,res){
                        if(err){
                            callbackFn(res,null);
                        }else{
                            redis.domain(userUid).h("leagueMember" + leagueUid).expire(604800);
                            callbackFn(null,members);
                        }
                    });
                }
            });
        }else{
            callbackFn(null,res);
        }
    });
}

/**
 * 返回联盟某个成员信息
 * @param userUid
 * @param leagueUid
 * @param memberUserUid
 * @param callbackFn
 */
function getMember(userUid,leagueUid,memberUserUid,callbackFn){
    getMembers(userUid,leagueUid,function(err,res){
        if(err){
            callbackFn(err);
        } else if(res == null || res[memberUserUid] == undefined){
            callbackFn('dbError');
        } else {
            var memberData = res[memberUserUid];
            callbackFn(null,memberData);
        }
    });
}

function checkMember(userUid,leagueUid,memberUserUid,callbackFn){
    getMembers(userUid,leagueUid,function(err,res){
        if(err){
            callbackFn(err);
        } else if(res == null || res[memberUserUid] == undefined){
            callbackFn(null,0);
        } else{
            callbackFn(null,1);
        }
    });
}

/**
 * 返回某个联盟的成员数量
 * @param userUid
 * @param leagueUid
 * @param callbackFn
 */
function getMemberNum(userUid,leagueUid,callbackFn){
    getMembers(userUid,leagueUid,function(err,res){
        if(err){
            callbackFn(err);
        }else{
            if(res == null){
                callbackFn(null,0);
            }else{
                var memberNum = 0;
                for(var key in res){
                    memberNum ++;
                }
                callbackFn(null,memberNum);
            }
        }
    })
}

/**
 * 添加联盟成员
 * @param userUid
 * @param leagueUid
 * @param memberUserUid
 * @param title 0 成员 1 副会长 2 会长
 * @param callbackFn
 */
function addMember(userUid,leagueUid,memberUserUid,title,callbackFn){
    var newData = {};
    newData["leagueUid"] = leagueUid;
    newData["userUid"] = memberUserUid;
    newData["leagueTitle"] = title;
    newData["leagueExp"] = 0;
    var sql = 'REPLACE INTO leagueMember SET ?';
    mysql.game(userUid).query(sql,newData,function(err,res) {
        if(err){
            callbackFn(err,null);
        }else{
            redis.domain(userUid).h("leagueMember" + leagueUid).setJSON(memberUserUid,newData,function(err,res){
                if(err){
                    callbackFn(err,null);
                }else{
                    redis.domain(userUid).h("leagueMember" + leagueUid).expire(604800);
                    callbackFn(null,1);
                }
            });
        }
    });
}

/**
 * 更新联盟成员数据
 * @param userUid
 * @param leagueUid
 * @param leagueMemberData
 * @param callbackFn
 */

function updateMember(userUid,leagueUid,leagueMemberData,callbackFn){
    var memberUserUid = leagueMemberData["userUid"] + "";
    var sql = "UPDATE leagueMember SET ? WHERE userUid=" + mysql.escape(memberUserUid) + " AND leagueUid=" + mysql.escape(leagueUid);
    mysql.game(userUid).query(sql,leagueMemberData,function(err,res){
        if (err) {
            callbackFn(err,null);
        } else {
            redis.domain(userUid).h("leagueMember" + leagueUid).setJSON(memberUserUid,leagueMemberData,function(err,res){
                if(err){
                    callbackFn(err,null);
                }else{
                    redis.domain(userUid).h("leagueMember" + leagueUid).expire(604800);
                    callbackFn(null,1);
                }
            });
        }
    });
}

/**
 * 删除联盟成员
 * @param userUid
 * @param leagueUid
 * @param memberUserUid
 * @param callbackFn
 */
function delMember(userUid,leagueUid,memberUserUid,callbackFn){
    var sql = 'DELETE FROM leagueMember WHERE leagueUid=' + mysql.escape(leagueUid) + " AND userUid=" + mysql.escape(memberUserUid);
    mysql.game(userUid).query(sql,function(err,res) {
        redis.domain(userUid).h("leagueMember" + leagueUid).hdel(memberUserUid,function(err,res){
            redis.domain(userUid).h("leagueMember" + leagueUid).expire(604800);
            callbackFn(null,1);//删除成功
        });
    });
}

/**
 * 删除一个联盟的所有成员
 * @param userUid
 * @param leagueUid
 * @param callbackFn
 */
function delMembers(userUid,leagueUid,callbackFn){
    var sql = 'DELETE FROM leagueMember WHERE leagueUid=' + mysql.escape(leagueUid);
    mysql.game(userUid).query(sql,function(err,res) {
        if(err){
            callbackFn(err,null);
        }else{
            redis.domain(userUid).h("leagueMember" + leagueUid).del(function(err,res){
                if(err){
                    callbackFn(err,null);
                }else{
                    callbackFn(null,1);//删除成功
                }
            });
        }
    });
}

/**
 * 返回某个玩家的所有联盟申请
 * @param userUid
 * @param callbackFn
 */
function getUserLeagueApply(userUid,callbackFn){
    redis.user(userUid).s("userLeagueApply").getObj(function(err,res){
        if(err){
            callbackFn(err);
        }else{
            if(res == null){
                callbackFn(null,null);
            }else{
                callbackFn(null,res);
            }
        }
    });
}

/**
 * 添加某个玩家的联盟申请
 * @param userUid
 * @param leagueUid
 * @param callbackFn
 */
function addUserLeagueApply(userUid,leagueUid,callbackFn){
    redis.user(userUid).s("userLeagueApply").getObj(function(err,res){
        if(err){
            callbackFn(err);
        }else{
            var applyData = res != null ? res : {};
            var obj = {};
            obj["leagueUid"] = leagueUid;
            obj["time"] = jutil.now();
            applyData[leagueUid] = obj;
            redis.user(userUid).s("userLeagueApply").setObj(applyData,function(err,res){
                if(err){
                    callbackFn(err);
                }else{
                    redis.user(userUid).s("userLeagueApply").expire(86400);//1天有效期
                    callbackFn(null,res);
                }
            });
        }
    });
}

/**
 * 删除某个玩家对某个联盟的申请
 * @param userUid
 * @param leagueUid
 * @param callbackFn
 */
function delUserLeagueApply(userUid,leagueUid,callbackFn){
    redis.user(userUid).s("userLeagueApply").getObj(function(err,res){
        if(err){
            callbackFn(err);
        } else{
            if(res == null){
                callbackFn(null);
            }else{
                var applyData = res;
                if(applyData.hasOwnProperty(leagueUid)){
                    delete applyData[leagueUid];
                }
                redis.user(userUid).s("userLeagueApply").setObj(applyData,function(err,res){
                    if(err){
                        callbackFn(err);
                    }else{
                        redis.user(userUid).s("userLeagueApply").expire(86400);//1天有效期
                        callbackFn(null,res);
                    }
                });
            }
        }
    });
}


/**
 * 删除某个玩家缓存中的所有联盟申请（包括在联盟缓存中记录的申请）
 * @param userUid
 * @param callbackFn
 */
function delAllUserLeagueApply(userUid,callbackFn){

    var leagueUids = [];//该玩家申请过的联盟列表
    async.series([
        //记录该玩家申请过的联盟列表
        function(cb){
            getUserLeagueApply(userUid,function(err,res){
                if(err){
                    cb(err);
                }else{
                    for(var key in res){
                        leagueUids.push(key);
                    }
                    cb(null);
                }
            });
        },
        //删除该玩家在联盟缓存中记录的所有申请
        function(cb){
            async.forEach(leagueUids,function(leagueUid,forCb) {
                delLeagueApply(userUid,leagueUid,userUid,function(err,res){
                    if(err){
                        forCb(err);
                    }else{
                        forCb(null);
                    }
                });
            },function(err){
                if(err) cb(err);
                else cb(null);
            });
        },
        //删除该玩家缓存中的所有联盟申请
        function(cb){
            redis.user(userUid).s("userLeagueApply").del(function(err,res){
                if(err){
                    cb(err);
                }else{
                    cb(null);
                }
            });
        }
    ],function(err){
        if(err){
            callbackFn(err);
        }else{
            callbackFn(null,null);
        }
    });
}

/**
 * 返回一个联盟所有玩家加入的申请
 * @param userUid
 * @param leagueUid
 * @param callbackFn
 */
function getLeagueAllApply(userUid,leagueUid,callbackFn){
    redis.domain(userUid).h("leagueApply" + leagueUid).getAllJSON(function(err,res){
        if(err){
            callbackFn(err);
        }else{
            callbackFn(null,res);
        }
    });
}

/**
 * 添加一个联盟玩家加入的申请
 * @param userUid
 * @param leagueUid
 * @param applyUserUid
 * @param callbackFn
 */
function addLeagueApply(userUid,leagueUid,applyUserUid,callbackFn){
    var newData = {};
    newData["applyUserUid"] = applyUserUid;
    newData["time"] = jutil.now();

    redis.domain(userUid).h("leagueApply" + leagueUid).setJSON(applyUserUid,newData,function(err,res){
        if(err){
            callbackFn(err);
        }else{
            redis.domain(userUid).h("leagueApply" + leagueUid).expire(86400);//1天有效期
            callbackFn(null,res);
        }
    });
}

/**
 * 删除一个联盟的某个玩家的加入申请
 * @param userUid
 * @param leagueUid
 * @param applyUserUid
 * @param callbackFn
 */
function delLeagueApply(userUid,leagueUid,applyUserUid,callbackFn){
    redis.domain(userUid).h("leagueApply" + leagueUid).hdel(applyUserUid,function(err,res){
        if(err){
            callbackFn(err);
        }else{
            redis.domain(userUid).h("leagueApply" + leagueUid).expire(86400);//1天有效期
            callbackFn(null,res);
        }
    });
}

/**
 * 删除一个联盟的所有玩家申请
 * @param userUid
 * @param leagueUid
 * @param callbackFn
 */
function delLeagueAllApply(userUid,leagueUid,callbackFn){
    redis.domain(userUid).h("leagueApply" + leagueUid).del(function(err,res){
        if(err){
            callbackFn(err);
        }else{
            callbackFn(null,res);
        }
    });
}

/**
 * 返回一个联盟的联盟动态
 * @param userUid
 * @param leagueUid
 * @param callbackFn
 */
function getLeagueNews(userUid,leagueUid,callbackFn){
    redis.domain(userUid).l("leagueNews" + leagueUid).range(0,9,function(err,res){
        if(err){
            callbackFn(err);
        }else{
            callbackFn(null,res);
        }
    });
}

/**
 * 添加一个联盟动态
 * @param userUid
 * @param leagueUid
 * @param newsData  {"userName","userLevel","heroId","time","type"}
 * @param callbackFn
 */
function addLeagueNews(userUid,leagueUid,newsData,callbackFn){
    redis.domain(userUid).l("leagueNews" + leagueUid).leftPush(JSON.stringify(newsData),function(err,res){
        if(err){
            callbackFn(err);
        }else{
            redis.domain(userUid).l("leagueNews" + leagueUid).trim(0,9);//保留10个动态
            redis.domain(userUid).l("leagueNews" + leagueUid).expire(86400);//1天有效期
            callbackFn(null,res);
        }
    });
}

/**
 * 删除一个联盟的所有动态
 * @param userUid
 * @param leagueUid
 * @param callbackFn
 */
function delLeagueAllNews(userUid,leagueUid,callbackFn){
    redis.domain(userUid).l("leagueNews" + leagueUid).del(function(err,res){
        if(err){
            callbackFn(err);
        }else{
            callbackFn(null,res);
        }
    });
}

/**
 * 联盟等级 -> 经验
 * @param userUid
 * @param level
 * @returns {*}
 */
function leagueLevelToExp(userUid,level){
    var configData = configManager.createConfig(userUid);
    var leagueConfig = configData.getConfig("league");
    if(level <= 0){
        return 0;
    }else{
        return leagueConfig["leagueLevel"][level - 1] ? leagueConfig["leagueLevel"][level - 1] : 0;
    }
}

function leagueExpToLevel(userUid,exp){
    var configData = configManager.createConfig(userUid);
    var leagueConfig = configData.getConfig("league")["leagueLevel"];
    if(exp <= 0){
        return 1;
    }else{
        for(var i = 1; i <= 100; i++){
            if(leagueConfig[i] == null || exp < leagueConfig[i]){
                return i;
            }
        }
        return 1;
    }
}

/**
 * 返回联盟成员数量上限
 * @param userUid
 * @param leagueUid
 * @param callbackFn
 */
function getLeagueMaxMemberNum(userUid,leagueUid,callbackFn){
    getLeague(userUid,leagueUid,function(err,res){
        if(err){
            callbackFn(err);
        }else{
            var configData = configManager.createConfig(userUid);
            var leagueConfig = configData.getConfig("league")["personCountLimit"];
            var leagueLevel = leagueExpToLevel(userUid,res["exp"]);
            var leagueMaxNum = leagueConfig[leagueLevel] ? leagueConfig[leagueLevel] : 25;
            callbackFn(null,leagueMaxNum);
        }
    });
}


/**
 * 判断联盟名是否存在
 * @param leagueName
 * @param callbackFn
 */
function leagueNameIsExist(userUid, leagueName, callbackFn) {
    mysql.dataIsExist(userUid, "league", "leagueName = " + mysql.escape(leagueName), function (err, res) {
        if (err) {
            callbackFn(null, 1);
        } else {
            callbackFn(null, res);
        }
    });
}

exports.getLeagues = getLeagues;
exports.getLeague = getLeague;
exports.addLeague = addLeague;
exports.updateLeague = updateLeague;
exports.delLeague = delLeague;

exports.getMembers = getMembers;
exports.getMemberNum = getMemberNum;

exports.getMember = getMember;
exports.checkMember = checkMember;
exports.addMember = addMember;
exports.updateMember = updateMember;
exports.delMember = delMember;
exports.delMembers = delMembers;

exports.getUserLeagueApply = getUserLeagueApply;
exports.addUserLeagueApply = addUserLeagueApply;
exports.delUserLeagueApply = delUserLeagueApply;
exports.delAllUserLeagueApply = delAllUserLeagueApply;

exports.getLeagueAllApply = getLeagueAllApply;
exports.addLeagueApply = addLeagueApply;
exports.delLeagueApply = delLeagueApply;
exports.delLeagueAllApply = delLeagueAllApply;

exports.getLeagueNews = getLeagueNews;
exports.addLeagueNews = addLeagueNews;
exports.delLeagueAllNews = delLeagueAllNews;

exports.leagueLevelToExp = leagueLevelToExp;
exports.leagueExpToLevel = leagueExpToLevel;
exports.getLeagueMaxMemberNum = getLeagueMaxMemberNum;

exports.leagueNameIsExist = leagueNameIsExist;