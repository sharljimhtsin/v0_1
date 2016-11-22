/**
 * User: lipi
 * Date: 14-2-3
 * Time: 下午3:13
 */


Ext.define('LipiUtil', {
    statics:{
        loadMask:null,
        loadMaskCount:0,
        lang:Ext.util.Cookies.get("language"),
        language:{},
        errorCheck:function(data, methodName) {
            if (data && data["tokenCheck"] != null && data["tokenCheck"]["ERROR"] == "tokenInvalid") {
                Ext.util.Cookies.clear("uid");
                Ext.util.Cookies.clear("pw");
                Ext.util.Cookies.clear("country");
                Ext.Msg.alert("提示", "会话已过期", function() {
                    location.reload();
                });
                return false;
            } else if (data && data["tokenCheck"] != null){
                Ext.Msg.alert("提示", data["tokenCheck"]["info"]);
                return false;
            } else {
                if (methodName != null) {
                    if (data[methodName] == null) {
                        Ext.Msg.alert("提示", "返回异常");
                        return false;
                    }
                    if (data[methodName]["ERROR"] != null) {
                        Ext.Msg.alert("提示", data[methodName]["info"]);
                        return false;
                    }

                } else {
                    return true;
                }
            }
        },
        showLoading:function(msg) {
            if(msg == undefined)msg = "请求中...";
            if (LipiUtil.loadMask == null) LipiUtil.loadMask = Ext.create(Ext.LoadMask,Ext.getBody(),{msg:msg});
            LipiUtil.loadMaskCount++;
            LipiUtil.loadMask.show();
        },
        hideLoading:function() {
            LipiUtil.loadMaskCount--;
            if (LipiUtil.loadMaskCount == 0 && LipiUtil.loadMask != null) {
                LipiUtil.loadMask.hide();
            }
        },

        leftShift:function(value, num) {//左移操作  同 <<   支持大于int类型
            return Math.pow(2,num) * value;
        },

        rightShift:function(value, num) { //右移操作  同 >>   支持大于int类型
            return Math.floor(value / Math.pow(2,num));
        },

        slice:function(value, start, end) { //截取一个数高位到低位之间的值  示例： slice(0x00E200, 16,8).toString(16)  返回 “E2"
            var mValue = value;
            if (end > 1) {
                mValue = LipiUtil.rightShift(value, end);
            }
            mValue = mValue % (Math.pow(2, start - end));
            return mValue;
        },

        parseUserUid:function(userUid) {
            var returnArray = [];

            var mCountry = LipiUtil.rightShift(userUid, 32);
            if (mCountry <= 0) mCountry = 1;

            var cStr = String.fromCharCode(mCountry + 96);
            returnArray.push(cStr);

            var mCity = LipiUtil.slice(userUid, 32, 24);
            if (mCity <= 0) mCity = 1;

            returnArray.push(mCity);
            for(var i in platformData){
                if(platformData[i][0] == cStr)
                    returnArray.push(platformData[i][1]);
            }

            return returnArray;
        },
        createUserUid:function(country, city, id){
            var a = country.charCodeAt(0) - 96;
            var b = city - 0;
            var c = id - 0;
            return LipiUtil.leftShift(a,32) + LipiUtil.leftShift(b, 24) + c;
        },
        sortOn:function (array, field, order) {
            array.sort(function(a, b) {
                return (a[field] - b[field]) * order;
            });
        },
        formatTime:function(format, time){
            if(time == undefined)time = new Date().getTime()/1000;
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
            if (/(y+)/.test(format)) format = format.replace(RegExp.$1, (d.getFullYear() + "").substr(4 - RegExp.$1.length));
            for (var k in o)
                if (new RegExp("(" + k + ")").test(format)) format = format.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
            return format;
        },
        t:function(name){
            var deLanguage = 'zh';
            if(this.language[name] == undefined){
                if(this.lang != undefined && this.lang != null && this.lang != "" && LipiUtil.language[this.lang] != undefined){
                    this.language[name] = LipiUtil.language[this.lang][name] == undefined?name:LipiUtil.language[this.lang][name];
                } else {
                    this.language[name] = LipiUtil.language[deLanguage][name] == undefined?name:LipiUtil.language[deLanguage][name];
                }
            }
            return this.language[name];
        }
}
});