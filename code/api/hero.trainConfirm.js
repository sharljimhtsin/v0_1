/**
 * 确认是否接受培养值
 * User: liyuluan
 * Date: 13-10-21
 * Time: 下午5:40
 */
var jutil = require("../utils/jutil");
var hero = require("../model/hero");

function start(postData, response, query) {
    if (jutil.postCheck(postData,"heroUid","confirm") == false) {
        response.echo("hero.trainConfirm",jutil.errorInfo("postError"));
        return;
    }

    var userUid = query["userUid"];
    var confirm = postData["confirm"];
    var heroUid = postData["heroUid"];

    if (confirm == 0) { //放弃培养
        var updateData = {"hpAdd":0,"attackAdd":0,"defenceAdd":0,"spiritAdd":0};
        hero.updateHero(userUid,heroUid,updateData,function(err,res){
            if (err) response.echo("hero.trainConfirm",jutil.errorInfo("dbError"));
            else {
                response.echo("hero.trainConfirm",{"result":1});
            }
        });
    } else {
        hero.getHero(userUid,function(err,res){
            if (err || res == null) response.echo("hero.trainConfirm",jutil.errorInfo("dbError"));
            else {
                var cHeroObj = res[heroUid];
                var _hp = cHeroObj["hp"] - 0;
                var _attack = cHeroObj["attack"] - 0;
                var _defence = cHeroObj["defence"] - 0;
                var _spirit = cHeroObj["spirit"] - 0;
                var _hpAdd = cHeroObj["hpAdd"] - 0;
                var _attackAdd = cHeroObj["attackAdd"] - 0;
                var _defenceAdd = cHeroObj["defenceAdd"] - 0;
                var _spiritAdd = cHeroObj["spiritAdd"] - 0;

                var updateData = {};
                updateData["hp"] = _hp + _hpAdd;
                updateData["attack"] = _attack + _attackAdd;
                updateData["defence"] = _defence + _defenceAdd;
                updateData["spirit"] = _spirit + _spiritAdd;
                updateData["hpAdd"] = 0;
                updateData["attackAdd"] = 0;
                updateData["defenceAdd"] = 0;
                updateData["spiritAdd"] = 0;
                var potentialValue = _hpAdd + _attackAdd + _defenceAdd + _spiritAdd;
                updateData["potential"] = (cHeroObj["potential"] - 0) - potentialValue;
                hero.updateHero(userUid,heroUid,updateData,function(err,res){
                    if (err) response.echo("hero.trainConfirm",jutil.errorInfo("dbError"));
                    else {
                        response.echo("hero.trainConfirm",updateData);
                    }
                });
            }
        });
    }
}

exports.start = start;