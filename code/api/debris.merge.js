/**
 * 残章合成
 * skill.merge
 * User: liyuluan
 * Date: 13-12-19
 * Time: 下午3:14
 */

var jutil = require("../utils/jutil");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var debris = require("../model/debris");
var skill = require("../model/skill");

var async = require("async");
var title = require("../model/titleModel");
var titleApi = require("../api/title.get");
var mongoStats = require("../model/mongoStats");

/**
 * 参数
 *      skillId 要合成的技能ID
 *
 * 返回
 *      debrisData 更改过的残章数据
 *      skillData 得到的技能数据
 *
 *
 * @param postData
 * @param response
 * @param query
 */
function start(postData, response, query) {
    if (jutil.postCheck(postData, "skillId") == false) {
        response.echo("debris.merge", jutil.errorInfo("postError"));
        return;
    }
    var skillId = postData["skillId"];
    var userUid = query["userUid"];
    var configData = configManager.createConfig(userUid);

    var skillConfig = configData.g("skill")(skillId)(); //判断配置是否存在
    if (skillConfig == null) {
        response.echo("debris.merge", jutil.errorInfo("configError"));
        return;
    }

    var gDebrisData = null; //残章数据

    var newDebrisData = {};
    var newSkill = null;//新技能数据
    var userIP = '127.0.0.1';//response.response.socket.remoteAddress;

    async.series([
        function(cb) { //验证残章是否存在
            debris.getDebrisItem(userUid, skillId, function(err, res) {
                if (err) cb("dbError");
                else {
                    gDebrisData = res;
                    if (gDebrisData == null || gDebrisData["operand"] == 0) cb("canNotMerge");
                    else {
                        var mPatchCount = (skillConfig["patchCount"] || 0) - 0;
                        if (mPatchCount == 0) cb("canNotMerge");
                        else {
                            for (var i = 1; i <= mPatchCount; i++) {
                                if (gDebrisData["type" + i] > 0) {
                                    newDebrisData["type" + i] = gDebrisData["type" + i] - 1;
                                } else {
                                    cb("canNotMerge");
                                    return;
                                }
                            }
                            newDebrisData["operand"] = gDebrisData["operand"] - 1;
                            newDebrisData["operandNum"] = gDebrisData["operandNum"] - 0 + 1;
                            cb(null);
                        }
                    }
                }
            });
        },
        function(cb) { //转为技能并添加
            skill.addSkill(userUid, skillId, 0, 1, function(err, res) {
                if (err) cb("dbError");
                else {
                    mongoStats.dropStats(skillId, userUid, userIP, null, mongoStats.DEBRIS_MERGE, 1);
                    newSkill = res;
                    cb(null);
                }
            });
        },
        function(cb) { //更新残章数据
            debris.updateDebrisItem(userUid, skillId, newDebrisData, function(err, res) {
                if (err) console.error(err.stack);
                else {
                    var mPatchCount = (skillConfig["patchCount"] || 0) - 0;
                    for (var i = 1; i <= mPatchCount; i++) {
                        mongoStats.expendStats(skillId, userUid, userIP, null, mongoStats.DEBRIS_MERGE, 1, 1, "type"+i);
                    }
                    newDebrisData["skillId"] = skillId;
                    cb(null);
                }
            });
        }
    ], function(err) {
        if (err) response.echo("debris.merge", jutil.errorInfo(err));
        else {
            // ADD BY LXB
            title.patchToSkillChange(userUid, function(){
                titleApi.getNewAndUpdate(userUid, "debris", function(err, res){
                    var result = {"debrisData":newDebrisData, "skillData":newSkill};
                    if (!err && res) {
                        result["titleInfo"] = res;
                    }
                    response.echo("debris.merge", result);
                });
            });
            // END
        }
    });
}

exports.start = start;