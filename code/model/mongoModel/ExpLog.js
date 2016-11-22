/**
 * 玩家经验的变量日志
 * User: liyuluan
 * Date: 14-4-18
 * Time: 下午3:16
 */

var mongo = require("../../alien/db/mongo");

var ExpSchema = new mongo.Schema(
    {
        userUid: Number,
        addExp: Number, //经验的增加值
        exp: Number, //变动后经验
        vip: Number, //VIP 等级
        time: {type: Number, default: Date.now}
    });

function getModel(userUid) {
    return mongo.getModel(userUid, "Exp", ExpSchema);
}


//保存一个经验改变日志
function save(userUid, addExp, exp, vip) {
    //getModel(userUid).create({"userUid": userUid, "addExp": addExp, "exp": exp, "vip": vip });
}


exports.getModel = getModel;
exports.save = save;

