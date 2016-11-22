/**
 * Created by xiayanxin on 2016/9/8.
 *
 * 帶時間戳的日志模塊
 */

var jutil = require("../../utils/jutil");

console.logWithTime = function (message) {
    console.info(jutil.now(), "___________START_________________");
    for (var i in arguments) {
        console.info(arguments[i]);
    }
    console.info(jutil.now(), "___________END___________________");
};

console.errWithTime = function (message) {
    console.warn(jutil.now(), "___________START_________________");
    for (var i in arguments) {
        console.warn(arguments[i]);
    }
    console.warn(jutil.now(), "___________END___________________");
};

console.log = console.logWithTime;
console.error = console.errWithTime;