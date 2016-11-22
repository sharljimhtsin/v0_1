/**
 * user.deleteAll
 * User: joseppe
 * Date: 14-4-9
 * Time: 上午11:59
 */


var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var async = require("async");
var configManager = require("../config/configManager");
var modelUtil = require("../model/modelUtil");
var specialTeam = require("../model/specialTeam");
var hero = require("../model/hero");
var item = require("../model/item");
var mail = require("../model/mail");
var teach = require("../model/teach");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userModify"], query["country"]) == false) {
        response.echo("user.deleteAll", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid", "funList") == false) {
        response.echo("user.deleteAll", jutil.errorInfo("postError"));
        return;
    }
    admin.addOneOperationLog("userInfo",query,postData);

    var userUid = postData["userUid"];
    var funList = postData["funList"];
    async.eachSeries(funList, function(fun, esCb){
        switch (fun){
//            case "formation":
            case "equipment":
            case "skill":
            case "heroSoul":
            case "debris":
            case "card":
                modelUtil.delData(fun, userUid, esCb);
                break;
            case "specialTeam":
                specialTeam.delSpecialTeam(userUid, esCb);
                break;
            case "hero":
                hero.delAllHero(userUid, esCb);
                break;
            case "item":
                item.getItems(userUid, function(err, res){
                    if(err){
                        esCb(err);
                    } else {
                        async.eachSeries(Object.keys(res), function(itemId, essCb){
                            item.updateItem(userUid, itemId, -res[itemId]["number"], essCb);
                        }, esCb);
                    }
                });
                break;
            case "mail":
                mail.delAllMail(userUid, esCb);
                break;
            case "teach"://点拨
                teach.delAllTeach(userUid,esCb);
                break;
            case "wBTeach"://指点
                teach.delAllWorldBossTeach(userUid,esCb);
                break;
            default :
                esCb(null);
                break;
        }
    }, function(err, res){
        response.echo("user.deleteAll", {"status":1});
    });
}
exports.start = admin.adminAPIProxy(start);