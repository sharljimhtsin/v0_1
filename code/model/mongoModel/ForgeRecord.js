/**
 * Created by xiazhengxin on 2015/1/28 15:55.
 *
 * 锻造系统MongoDB 模型类
 */

var mongo = require("../../alien/db/mongo");
var TAG = "ForgeRecord";
var ForgeRecordSchema = new mongo.Schema({
    user: String,
    item: String,
    timeTag: String,
    time: {type: Number, default: Date.now}
});

function getModel(userUid) {
    return mongo.getModel(userUid, TAG, ForgeRecordSchema);
}

exports.getModel = getModel;