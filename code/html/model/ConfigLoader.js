/**
 * Created with JetBrains WebStorm.
 * User: apple
 * Date: 13-7-18
 * Time: 下午8:28
 * To change this template use File | Settings | File Templates.
 */

Ext.define('ConfigLoader', {
    statics:{
        configCache:{},
        url:"/config?name=",
        get:function(configName,callbackFn){
            if(ConfigLoader[configName] != null) {
                callbackFn(ConfigLoader[configName]);
            }else{
                var mUrl = ConfigLoader.url+configName;
                Ext.Ajax.request({
                    url:mUrl,
                    callback:function(mRequest,isSuccess,result) {
                        var mResponseText = Ext.decode(result["responseText"]);
                        ConfigLoader[configName] = mResponseText;
                        callbackFn(mResponseText);
                    }
                });
            }
        }
    }
});