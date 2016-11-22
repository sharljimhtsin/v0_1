/**
 * 工具类
 * User: liyuluan
 * Date: 13-10-11
 * Time: 下午12:04
 */

var errorConfig;// = require("../config/errorConfig.json");
var stopWord;// = require("../../config/a/stopWord")["stopWord"];


/**
 * 错误信息构造类
 * @param str
 * @param [data]
 * @constructor
 */
function JError(str, data) {
    this.info = str;
    this.data = data || null;
}


//检查post参数的有效性
function postCheck(posData, arg) {
    if (posData == null && arguments.length > 1) return false;
    for (var i = 1; i < arguments.length; i++) {
        var key = arguments[i];
        if (posData[key] === undefined) {
            return false;
        }
    }
    return true;
}
/**
 * 验证字段是否存在
 * @param dataArr
 * @param keyArr
 */
function dataConfirm(dataArr, keyArr) {
    var dataL = dataArr.length;
    var dataError = null;
    for (var i = 0; i < dataL; i++) {
        var item = dataArr[i];
        if (item == null) {
            dataError = "dbError";
            break;
        }
        var keyItem = keyArr[i] == null ? null : keyArr[i];
        if (keyItem == null) break;
        var keyItemL = keyItem.length;
        for (var j = 0; j < keyItemL; j++) {
            var keyStr = keyItem[j]; //需要检查的字段
            var strItemArr = keyStr.split(".");
            var index = 0;
            var confirmStr = "";
            var cObj = item;
            while (index != strItemArr.length) {
                confirmStr = strItemArr[index];
                cObj = cObj[confirmStr];
                if (cObj == null) {
                    dataError = "dbError";
                    break;
                }
                index++;
            }//while
            if (dataError != null) break;
        }//for
        if (dataError != null) break;
    }//for
    return dataError;
}

/**
 * 取得错误的描述并格式化
 * @param name
 * @returns {{ERROR: *, info: *}}
 */
function errorInfo(name) {
    var errorInfo = name;
    if(errorConfig == undefined)
        errorInfo = name;
    else if (errorConfig[name] == undefined)
        errorInfo = name;
    else
        errorInfo = toBase64(errorConfig[name]);
    var obj = {"ERROR": name, "info": errorInfo};
    return obj;
}

/**
 * 随机一个16个字符长度的字符串
 * @returns {string}
 */
function randomString() {
    var token = "";
    for (var i = 0; i < 16; i++) {
        token += Math.ceil(Math.random() * 36).toString(36);
    }
    return token;
}

//将多个数相加
function add() {
    var num = 0;
    for (var i = 0; i < arguments.length; i++) {
        num += (arguments[i] - 0);
    }
    return num;
}

//copy一个object,（不递规）
function copyObject(obj) {
    var newObj = {};
    for (var key in obj) {
        if(typeof obj[key] == 'array' || typeof obj[key] == 'object')
            newObj[key] = copyObject(obj[key]);
        else
            newObj[key] = obj[key];
    }
    return newObj;
}

//深复制
function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * 比较两个时间，判断是否同一天
 * @param time1
 * @param time2
 */
function compTimeDay(time1, time2) {
    var date1 = new Date(time1 * 1000);
    var date2 = new Date(time2 * 1000);
    if (date1.getFullYear() == date2.getFullYear() && date1.getMonth() == date2.getMonth() && date1.getDate() == date2.getDate()) {
        return true;
    } else {
        return false;
    }
}
/**
 * 概率算法
 */
function proFunction(array) {
    var returnArr = [];
    for (var i = 0; i < array.length; i++) {
        var obj = {};
        var upItem = (i > 0 && (returnArr[i - 1]) != null) ? returnArr[i - 1] : null;
        proOne(upItem, obj, array[i]["prob"]);
        returnArr.push(obj);
    }
    return returnArr;
}
function proOne(upItem, cItem, prob) {
    if (upItem == null) {
        cItem["minProb"] = 0;
        cItem["maxProb"] = prob;
    }
    else {
        cItem["minProb"] = upItem["maxProb"];
        cItem["maxProb"] = upItem["maxProb"] + prob;
    }
}
//返回当前的时间 ，（秒）
function now() {
    return Math.floor(nowMillisecond() / 1000);
}

function todayTime() {
    var date = new Date(now() * 1000);
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    return Math.floor(date.getTime() / 1000);
}

function day() {
    return Math.floor((nowMillisecond() / 1000 - (new Date(2013, 10, 1) / 1000)) / 60 / 60 / 24);
}

function getDayOfYear() {
    var now = new Date();
    var start = new Date(now.getFullYear(), 0, 0);
    var diff = now - start;
    var oneDay = 1000 * 60 * 60 * 24;
    var day = Math.floor(diff / oneDay);
    return day;
}

function monday() {
    var date = new Date(now() * 1000);
    var day = date.getDay() == 0?7:date.getDay();
    date.setDate(date.getDate()+1-day);
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    return Math.floor(date.getTime() / 1000);
}

function nowMillisecond() {
    return Date.now() + getTimeOffset();
}


var _timeOffset = 0;//设定默认时间偏移量（毫秒数）

function getTimeOffset() {
    return _timeOffset;
}

//设置时间的偏移值
function setTimeOffset(v) {
    _timeOffset = v;
    return now();
}

/**
 * 获取天数偏移后的时间（秒）
 * @param _now  当前时间（秒）
 * @param dayOft 偏移的天数
 * @returns {number}
 */
function dayOffset(_now, dayOft) {
    var date1 = new Date(_now * 1000);
    date1.setSeconds(0);
    date1.setMinutes(0);
    date1.setHours(0);
    date1.setDate(date1.getDate() + 1);
    return date1.getTime() / 1000;
}


/**
 * 设置一个数的某位的值为1 (用于位标识)
 * @param bit
 * @param index
 * @returns {int}
 */
function bitSetTrue(bit, index) {
    return bit | (1 << index);
}
function formatString(format, exchangeArr) {
    if (exchangeArr == null) {
        return "";
    }
    for (var i = 0; i < exchangeArr.length; i++) {
        var reg = new RegExp("\\{" + i + "\\}", "g");
        format = format.replace(reg, exchangeArr[i]);
    }
    return format;
}
/**
 * 取某个数的某位的值  (用于位标识)
 * @param bit
 * @param index
 * @returns {number}
 */
function bitGet(bit, index) {
    return (bit >> index) & 1;
}

/**
 * 实例化位数字
 * @returns {number}
 */
function newBit() {
    var bitValue = 0;
    for (var i = 0; i < arguments.length; i++) {
        var iValue = arguments[i]
        var offset = arguments.length - i - 1;
        bitValue = bitValue | (iValue << offset);
    }
    return bitValue;
}


/**
 * 返回base64后的字符串
 */
function toBase64(str) {
    if (str == null || str == "") return "";
    return "#<" + new Buffer(str).toString('base64') + ">#";
}

function fromBase64(str) {
    var nStr = str.replace("#<", "").replace(">#", "");
    return new Buffer(nStr, 'base64').toString();
}

//http://julabs.com/blog/js-php-encode/
function urlEncodePhpStyle(str) {
    var tmp = encodeURIComponent(str);
    return tmp.replace("%20", "+");
}

/**
 * 生成一个新的guid
 */
function guid() {
    var guid = "";
    for (var i = 1; i <= 32; i++) {
        var n = Math.floor(Math.random() * 16.0).toString(16);
        guid += n;
    }
    return guid;
}


/**
 * 判断一个city是否在一个cityList字符串里
 * @param city
 */
function indexOf(cityList, city) {
    if (cityList == "0") return true;
    else {
        var arr = cityList.split(",");
        if (arr[0] != -1) {
            city = city + "";
            if (arr.indexOf(city) != -1) return true;
            else return false;
        } else {
            if (arr.indexOf(city) != -1) return false;
            else return true;
        }
    }
}
var filterReg = /[^\u0000-\uffff0-9a-zA-Z_\.\_\,\ \:\|\。\?\;]/g;

//过滤文字
function filterWord(text) {
    text = text.replace(filterReg, "");//text.replace(/[\'\"\{\}\[\]\:\,\\]/g, "")
    for (var i = 0; i < _stopWord1.length; i++) {
        var t = trim(_stopWord1[i]);
        var index = text.indexOf(t);
        if (index != -1) return false;
    }
    for (var i = 0; i < _stopWord2.length; i++) {
        var t = trim(_stopWord2[i]);
        text = text.replace(new RegExp(t, "g"), "***");
    }
    return text;

}

function filterWord2(text) {
    text = text.replace(filterReg, "");//text.replace(/[\'\"\{\}\[\]\:\,\\]/g, "")
    for (var i = 0; i < _stopWord1.length; i++) {
        var t = trim(_stopWord1[i]);
        text = text.replace(new RegExp(t, "g"), "*");
    }
    for (var i = 0; i < _stopWord2.length; i++) {
        var t = trim(_stopWord2[i]);
        text = text.replace(new RegExp(t, "g"), "*");
    }
    return text;
}

function trim(text)
{
    return text.replace(/(^\s*)|(\s*$)/g, '');
}

var _stopWord1 = [];
var _stopWord2 = [];

function setConfigList(name, config){
    if(name == 'errorConfig' && errorConfig == null)
        errorConfig = config;
    if(name == 'stopWord' && stopWord == null){
        stopWord = config['stopWord'];
        _stopWord1 = config['stopWord']["text1"];
        _stopWord2 = config['stopWord']["text2"];
    }
}

function formatTime(format, time){
    if(time == undefined) time = now();
    var d = new Date(time*1000);
    var o = {
        "Y+": d.getFullYear(), //年
        "m+": d.getMonth()>8?d.getMonth() + 1:"0"+(d.getMonth() + 1), //月份d
        "d+": d.getDate()>9?d.getDate():"0"+d.getDate(), //日
        "H+": d.getHours()>9?d.getHours():"0"+d.getHours(), //小时
        "h+": d.getHours()%12>9?d.getHours()%12:"0"+(d.getHours()%12), //小时
        "i+": d.getMinutes()>9?d.getMinutes():"0"+d.getMinutes(), //分
        "s+": d.getSeconds()>9?d.getSeconds():"0"+d.getSeconds(), //秒
        "q+": Math.floor((d.getMonth() + 3) / 3), //季度
        "S": d.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(format)) format = format.replace(RegExp.$1, (d.getFullYear() + "").substr(4 - (RegExp.$1.length == 1?2:RegExp.$1.length)));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(format)) format = format.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return format;
}
//截取字符串
function pad(str, len, s, isRight){
    s = s == undefined?' ':s;
    var padStr = Array(len>str.length?(len-str.length+1):0).join(s)
    return isRight?str+padStr:padStr+str;
}

function getProperExpireTimeOfRedis(sTime, eTime) {
    var diff = eTime - sTime;
    var sevenDays = 60 * 60 * 24 * 7;
    var timePassed = now() - sTime;
    return (diff > sevenDays ? sevenDays : diff) - timePassed;
}

exports.randomString = randomString;
exports.JError = JError;
exports.postCheck = postCheck;
exports.errorInfo = errorInfo;
exports.add = add;
exports.copyObject = copyObject;
exports.compTimeDay = compTimeDay;
exports.now = now;
exports.todayTime = todayTime;
exports.day = day;
exports.monday = monday;
exports.getDayOfYear = getDayOfYear;
exports.nowMillisecond = nowMillisecond;
exports.getTimeOffset = getTimeOffset;
exports.setTimeOffset = setTimeOffset;
exports.bitSetTrue = bitSetTrue;
exports.bitGet = bitGet;
exports.newBit = newBit;
exports.toBase64 = toBase64;
exports.fromBase64 = fromBase64;
exports.guid = guid;
exports.filterWord = filterWord;
exports.filterWord2 = filterWord2;
exports.indexOf = indexOf;
exports.formatString = formatString;
exports.proFunction = proFunction;
exports.dataConfirm = dataConfirm;
exports.dayOffset = dayOffset;
exports.setConfigList = setConfigList;
exports.formatTime = formatTime;
exports.pad = pad;
exports.deepCopy = deepCopy;
exports.getProperExpireTimeOfRedis = getProperExpireTimeOfRedis;
exports.urlEncodePhpStyle = urlEncodePhpStyle;