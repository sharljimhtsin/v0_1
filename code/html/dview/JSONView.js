/**
 * Created with JetBrains WebStorm.
 * User: apple
 * Date: 13-8-2
 * Time: 下午6:04
 * To change this template use File | Settings | File Templates.
 */

var Dv = {
    /* 判断一个对象是否是个列表  */
    objIsList:function(obj) {
        var count = 0;
        var keyStr = "";

        for (var key in obj) {
            if (Ext.isObject(obj[key])) {
                var item = obj[key];
                var itemKeyStr = "";

                for (var itemKey in item) {
                    itemKeyStr += itemKey;
                }

                if (keyStr != "" && keyStr != itemKeyStr) {
                    return false;
                } else {
                    keyStr = itemKeyStr;
                    count += 1;
                }

                if (count > 2) {
                    return true;
                }
            } else {
                return false;
            }
        }
        return false;
    },

    /* 将列表型 obj 转为数组 */
    objToArray:function(obj) {
        var arr = [];
        if (Ext.isArray(obj) === false && Ext.isObject(obj) === false) {
            return arr;
        }

        if (Ext.isArray(obj)) {
            if (obj.length > 0 && Ext.isObject(obj[0])) {
                return obj;
            } else {
                for (var i = 0; i < obj.length; i++) {
                    arr.push({index:i,value:obj[i]});
                }
                return arr;
            }
        } else {
            if (Dv.objIsList(obj)) {
                for (var key in obj) {
                    var item = obj[key];
                    item["objKey"] = key;
                    arr.push(item);
                }
            } else {
                for (var key in obj) {
                    var item = {};
                    item["名称"] = key;
                    item["值"] = obj[key];
                    arr.push(item);
                }
            }
        }
        return arr;
    },

    /* 取得 数组项的 columns 格式*/
    getColumns:function(arr) {
        if (arr === null || typeof arr === undefined || arr.length === 0) {
            return [["id"],[{text:"JSON",dataIndex:"id",flex:1}]];
        }
        var columns = [];
        var fields = [];
        var obj = arr[0];
        if (Ext.isObject(obj)) {
            for (var key in obj) {
                var columnItem = {};
                columnItem["text"] = key;
                columnItem["dataIndex"] = key;
                columnItem["flex"] = 1;
                columns.push(columnItem);
                fields.push(key);
            }
        } else {
            return [["value"],[{text:"值",dataIndex:"value",flex:1}]];
        }
        return [fields,columns];
    }



}








/**
 * JSON的树状显示视图
 */
Ext.define('Ext.ux.DvJsonTree', {
    extend:'Ext.tree.Panel',
    alias:'widget.dvJsonTree',
    config:{
        jsonObj:null
    },
    initComponent:function() {
        var me = this;
        me.initConfig();
        Ext.apply(me,{fields:["text","jsonData"],root:{ text:"JSON", expanded: false, children: [] ,iconCls:"objectIcon"}});
        me.callParent();
//        me.store.setRootNode({ text:"JSON", expanded: false, children: [] ,iconCls:"objectIcon"});
    },
    loadJSON:function(data) {
        if (data == null || data == this.jsonObj) {
            return;
        }
//        console.log(data, this.jsonObj);
        this.jsonObj = data;

        var sJSON = jsonToTreeJSON(data,{ text:"JSON", expanded: false, children: [] ,iconCls:"objectIcon"});
        this.store.setRootNode(sJSON);

        function jsonToTreeJSON(json,parent,dataObj) {
            var mType = Ext.typeOf(json);
            switch (mType) {
                case "object":
                case "array":
                    for(var key in json) {
                        var item = json[key];
                        var cObj = {text : key};
                        parent["expanded"] = false;
                        if(parent["children"] == null) parent["children"] = [cObj];
                        else parent["children"].push(cObj);
                        parent["jsonData"] = json;
                        parent["iconCls"] = (mType === "object")?"objectIcon":"arrayIcon";
                        jsonToTreeJSON(item,cObj,json);
                    }
                    break;
                case "string":
                case "number":
                    var mText = parent["text"];
                    mText += " : ";
                    mText += json;
//                    mText += "<span class='blueText'>" + json + "</span>";

                    parent["jsonData"] = dataObj;
                    parent["text"] = mText;
                    parent["leaf"] = true;
                    parent["iconCls"] = (mType === "string")?"blueIcon":"greenIcon";
                    break;
            }
            return parent;
        }
    }

});


/**
 * JSON输入框
 */
Ext.define('Ext.ux.DvJsonText', {
    extend:'Ext.panel.Panel',
    alias:'widget.dvJsonText',
    config:{
        jsonText:"",
        jsonObj:null,
        formatObj:null
    },
    constructor:function() {
        this.initConfig();
        this.callParent();
    },
    initComponent:function() {
        var me = this;

        me.addEvents({//加入自定义事件
            "jsonObjComp" : true
        });

        me.tbar = [
            {xtype:"button",text:"格式化",handler:function() {
                me.format();
            }},
            {xtype:"button",text:"去除空格",handler:function() {
                me.removeSpaces();
            }}
        ];
        me.html = "<div contenteditable='true' style='width: 100%;height: 100%; overflow-y:scroll' id='dvJsonText'></div>"
        me.callParent();

        var setTimeoutFn = function(){
            if (document.getElementById('dvJsonText') != null) {
                document.getElementById('dvJsonText').onkeydown = function(e){
                    e = e || event;
                    var keyCode = e.keyCode || e.which || 0;
                    if (keyCode == '9'){
                        var tabSpace = '　';//全角空格，插入tab时
                        if (document.all){
                            document.selection.createRange().pasteHTML(tabSpace);
                        } else {
                            document.execCommand('InsertHtml', null, tabSpace);
                        }
                        return false;
                    }
                };
            } else {
                setTimeout(setTimeoutFn,1000);
            }
        }

        setTimeout(setTimeoutFn,1000);
    },
    getJSONObj:function() {
        try{
            var mText = Ext.get("dvJsonText").dom.innerHTML;
            if (this.jsonText != mText) {
                mText = mText.replace(/<[^>].*?>/g,"");
                mText = mText.replace(/\&nbsp\;/g,"");
                var jsonObj = Ext.decode(mText);
                this.jsonText = mText;
                this.jsonObj = jsonObj;
                return jsonObj;
            } else {
                return this.jsonObj;
            }

        }catch(e){
//            console.log(e,mText);
            Ext.Msg.alert("错误","JSON格式不正确！");
            return null;
        }
    },
    removeSpaces:function() {
        var mText = Ext.get("dvJsonText").dom.innerHTML;
        mText = mText.replace(/<[^>].*?>/g,"");
        mText = mText.replace(/\&nbsp\;/g,"");
        mText = mText.replace(/　/g,"");
        Ext.get("dvJsonText").dom.innerHTML = mText;
    },
    format:function() {
        var jsonObj = this.getJSONObj();
        if (jsonObj !== this.formatObj && jsonObj !== null) {
            var getTabText = function(count) {
                if (count < 0) return "";
                var tabText = "　";
                var returnText = "";
                for (var i = 0; i < count; i++) {
                    returnText += tabText;
                }
                return returnText;
            };
            var formatFn = function(obj,tabCount) {
                var mText = "";
                if (typeof tabCount === "undefined") tabCount = 0;
                var mTabText = getTabText(tabCount + 1);
                if (Ext.isObject(obj) === true) {
                    mText += "{<br/>";
                    var objArray = [];
                    for (var key in obj) {
                        var itemStr = "";
                        itemStr += mTabText;
                        itemStr += "<span class='jsonKey'>" + key + "</span>";
                        itemStr += ": ";
                        itemStr += formatFn(obj[key],tabCount + 1);
                        objArray.push(itemStr);
                    }
                    mText += objArray.join(",<br/>");
                    mText += "<br/>";
                    mText += getTabText(tabCount) + "}";
                } else if(Ext.isArray(obj) === true) {
                    mText += "[<br/>";
                    var arrArray = [];
                    for (var i = 0; i < obj.length; i++) {
                        arrArray.push(mTabText + formatFn(obj[i],tabCount + 1));
                    }
                    mText += arrArray.join(",<br/>");
                    mText += "<br/>";
                    mText += getTabText(tabCount) + "]";
                } else if(Ext.isString(obj) === true) {
                    mText += "<span class='jsonStringItem'>\"" + obj + "\"</span>";
                } else if(Ext.isNumber(obj) === true) {
                    mText += "<span class='jsonNumberItem'>" + obj + "</span>";
                } else if(obj === null) {
                    mText += "<span class='jsonNullItem'>" + obj + "</span>";
                }

                return mText;
            };
            var formatText = formatFn(jsonObj);
            Ext.get("dvJsonText").dom.innerHTML = formatText;
            this.formatObj = jsonObj;
        }
    }
});
//
//{xtype:"button",text:"显示树",handler:function(){
//    var mText = Ext.get("dvJsonText").dom.innerHTML;
//    try{
//        mText = mText.replace(/<[^>].*?>/g,"");
//        var jsonObj = Ext.decode(mText);
//        me.fireEvent("jsonComp",jsonObj);
//    }catch(e){
//        console.log(e,mText);
//        Ext.Msg.alert("错误","JSON格式不正确！");
//    }
//}},
//'-',



/**
 * JSON表格视图
 */
Ext.define('Ext.ux.DvJsonGrid', {
    extend:"Ext.grid.Panel",
    alias:'widget.dvJsonGrid',
    initComponent:function() {
        var me = this;

        me.store = Ext.create("Ext.data.ArrayStore",{
            fields:["id"],
            data:[]
        });

        me.columns = [{text:"ID",dataIndex:"id",flex:1}];
        me.callParent();
    },
    setJsonData: function(data) {
        var me = this;

        var dataArray = Dv.objToArray(data);
        var fieldsColumns = Dv.getColumns(dataArray);
        var mFields = fieldsColumns[0];
        var mColumns = fieldsColumns[1];

        var mStore = Ext.create("Ext.data.ArrayStore",{
            fields:mFields,
            data:[]
        });
//        console.log(dataArray,mFields,mColumns);
        me.reconfigure(mStore,mColumns);
        me.store.loadData(dataArray);


    }
});









