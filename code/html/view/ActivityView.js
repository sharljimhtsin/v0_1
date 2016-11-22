/**
* User: liyuluan
* Date: 14-3-14
* Time: 下午4:08
* 活动界面：（新增批量发布功能--za）
*/
var banner = "";
function ActivityView() {
    function getTotleServer(){
        var returnData = [];
        var addAll = {boxLabel: LipiUtil.t("添加所有分区"), name: "all",checked: true,listeners: {afterrender: function (obj) {
            obj.getEl().last().last().last().first().dom.onclick = function (obj) {
                var checkGroup = Ext.getCmp('chang').items;
                var checkL = checkGroup.length;
                var check = checkGroup.get(0).checked == false ? true : false;
                for(var j = 1 ; j < checkL ; j ++){
                    var item = checkGroup.get(j);
                    item.setValue(check);
                }
            }
            }
        }};
        returnData.push(addAll);
        for(var i = 0 ; i < gData["serverList"].length ; i ++){
            var name = gData["serverList"][i][1];
            var id = gData["serverList"][i][0];
            if(id == "0") continue;
            var obj = {boxLabel: name, name: id,checked: true};
            returnData.push(obj);
        }
        return returnData;
    }

    function showCopyServerWindow(title, city, callbackFn){
        var aindow = Ext.create("Ext.window.Window",{
            title:title,
            modal:true,
            width:572,
            minHeight:220,
            items : [{
                xtype: 'checkboxgroup',
                name: 'aaa',
                width: 572,
                minHeight: 220,
                columns: 3,
                align:"center",
                id:"chang",
                items:getTotleServer()
            }],
            buttons:[
                {xtype:"button",text: LipiUtil.t("确定"),handler:function(){
                    var checkGroup = Ext.getCmp('chang').items;
                    var checkL = checkGroup.length;
                    var serverList = [];
                    for(var j = 1 ; j < checkL ; j ++){
                        var item = checkGroup.get(j);
                        var checked = item.checked;
                        var sendData = {};
                        if(checked == true && item.name != city){
                            serverList.push(item.name);
                        }
                    }
                    aindow.close();
                    callbackFn(serverList);
                }},
                {xtype:"button",text: LipiUtil.t("取消"),handler:function(){
                    aindow.close();
                }}
            ]
        });
        aindow.show();
    }
    function showDeleteServerWindow(title, callbackFn){
        var aindow = Ext.create("Ext.window.Window",{
            title:title,
            modal:true,
            width:572,
            minHeight:220,
            items : [{
                xtype: 'checkboxgroup',
                name: 'aaa',
                width: 572,
                minHeight: 220,
                columns: 3,
                align:"center",
                id:"chang",
                items:getTotleServer()
            }],
            buttons:[
                {xtype:"button",text: LipiUtil.t("确定"),handler:function(){
                    var checkGroup = Ext.getCmp('chang').items;
                    var checkL = checkGroup.length;
                    var serverList = [];
                    for(var j = 1 ; j < checkL ; j ++){
                        var item = checkGroup.get(j);
                        var checked = item.checked;
                        if(checked == true && item.name != "0"){
                            serverList.push(item.name);
                        }
                    }
                    aindow.close();
                    callbackFn(serverList);
                }},
                {xtype:"button",text:LipiUtil.t("取消"),handler:function(){
                    aindow.close();
                }}
            ]
        });
        aindow.show();
    }
    //批量导入活动
    function showWindow(title, data, callbackFn) {
        var mWindow = Ext.create("Ext.window.Window", {
            title: title,
            modal: true,
            width: 650,
            height: 420,
            fieldDefaults: {labelSeparator: ":"},
            bodyStyle: 'padding:5px 0px 20px 6px',
            buttons: [
                {xtype: "button", text: LipiUtil.t("确定"), handler: function () {
                    var newData = Ext.getCmp("mWindowForm").getValues();
                    var sDate = new Date(newData["sTime"]);
                    var sTimeArray = newData["sTime2"].split(":");
                    sDate.setHours(sTimeArray[0] - 0);
                    sDate.setMinutes(sTimeArray[1] - 0);
                    newData["sTime"] = Math.floor(sDate.getTime() / 1000);
                    var eDate = new Date(newData["eTime"]);
                    var eTimeArray = newData["eTime2"].split(":");
                    eDate.setHours(eTimeArray[0] - 0);
                    eDate.setMinutes(eTimeArray[1] - 0);
                    newData["eTime"] = Math.floor(eDate.getTime() / 1000);
                    callbackFn(newData);
                    mWindow.close();
                }},
                {xtype: "button", text: LipiUtil.t("取消"), handler: function () {
                    mWindow.close();
                }}
            ],
            items: [
                {
                    xtype: "form",
                    border: false,
                    bodyPadding: 5,
                    id: "mWindowForm",
                    defaultType: "textfield",
                    bodyStyle: "background:#DFE9F6",
                    fieldDefaults: {labelWidth: 80},
                    items: [
                        {xtype: "textfield", fieldLabel: "活动名", name: "activityName"},
                        {
                            xtype: "fieldcontainer",
                            fieldLabel: '开始时间',
                            layout: {type: 'hbox'},
                            items: [
                                {xtype: "datefield", name: "sTime", value: new Date(), format: 'Y-m-d'},
                                {xtype: 'splitter'},
                                {xtype: "timefield", name: "sTime2", value: "08:00", format: 'H:i'}
                            ]
                        },
                        {
                            xtype: "fieldcontainer",
                            fieldLabel: '结束时间',
                            layout: {type: 'hbox'},
                            items: [
                                {xtype: "datefield", name: "eTime", value: new Date(new Date().getTime() + 24 * 60 * 60 * 1000 * 3), format: 'Y-m-d'},
                                {xtype: 'splitter'},
                                {xtype: "timefield", name: "eTime2", value: "08:00", format: 'H:i'}
                            ]
                        },
                        {xtype: "textfield", fieldLabel: "NAME", name: "name"},
                        {xtype: "textfield", fieldLabel: "参数", name: "arg", width: 600, value: "-1"},
                        {xtype: "textareafield", fieldLabel: "配置", name: "config", width: 600, height: 200}
                    ]
                }
            ]
        });
        mWindow.show();
        if (data != null) {
            var newData = {};
            for (var key in data) {
                newData[key] = data[key];
            }
            newData["sTime"] = new Date(data["sTime"] * 1000);
            newData["eTime"] = new Date(data["eTime"] * 1000);
            newData["sTime2"] = new Date(data["sTime"] * 1000);//.getHours() + ":" + new Date(data["sTime"] * 1000).getMinutes();
            newData["eTime2"] = new Date(data["eTime"] * 1000);//.getHours() + ":" + new Date(data["eTime"] * 1000).getMinutes();
            Ext.getCmp("mWindowForm").form.setValues(newData);
        }
    }

    function importWindow(title) {
        var imploadData = Ext.create("Ext.form.Panel",{
            fileUpload:true,
            frame:true,//是否渲染表单
            layout:{type:"vbox"},
            bodyPadding:"10px 0px 0px 10px",
            fieldDefaults:{labelWidth:70},
            defaults:{border:false,bodyPadding:"0 0 0 0",bodyStyle:'background-color:#DFE9F6'},
            items: [
                {xtype: "textareafield", fieldLabel: "批量文本", name: "content",width:550,height:250},
                {xtype : 'button',text : '保存',width:60,handler:function(){
                    var formValues = imploadData.form.getValues();
                    var content = formValues["content"];
                    LipiUtil.showLoading();
                    try {
                        var mArray = JSON.parse(content)
                        if (mArray instanceof Array) {
                            if (mArray.length == 0) throw new Error("空数组");
                        } else {
                            throw new Error("格式错误");
                        }
                    } catch (err) {
                        LipiUtil.hideLoading();
                        console.log(err.message);
                        Ext.Msg.alert("提示", "格式错误!");
                        return;
                    }
                    async.eachSeries(mArray, function(formValue, cb){
                        async.eachSeries(formValue["cityList"], function(city, cb1){
                            formValue["city"] = city;
                            LHttp.post("activityConfig.add", formValue, function (resData) {
                                if (LipiUtil.errorCheck(resData, "activityConfig.add") == false) return;
                                cb1(null);
                            });
                        },function(err, res){
                            var cc1 = JSON.parse(formValue["cityList"]);
                            if(cc1 == 0||cc1 == "all") cc1 = "全区";
                            Ext.Msg.alert("活动导入成功！影响大区： =>" + JSON.stringify(cc1));
                            cb(null);
                        });
                    },function(err, res){
                        LipiUtil.hideLoading();
                        getActivityList();
                    });
                }},
                {xtype: "label", height:30},
                {xtype: "label", text: '示例格式如下，内容说明参考《添加邮件》', style:'color:#999'},
                {xtype: "label" , text: '[{"activityName":"222","sTime":1414972800,"eTime":1415232000,"name":"333","arg":"0","config":"{}","cityList":[0]}]', style:'color:#999', width:550}
            ]
        });
        var mWindow = Ext.create("Ext.window.Window", {
            title: title,
            modal: true,
            width: 650,
            height: 420,
            fieldDefaults: {labelSeparator: ":"},
            bodyStyle: 'padding:5px 5px 5px 5px',
            items: [
                imploadData
            ]
        });
        mWindow.show();
    }

    function tipsWindow(title) {//za 做个标记
        var imploadData = Ext.create("Ext.form.Panel",{
            fileUpload:true,
            frame:true,//是否渲染表单
            layout:{type:"vbox"},
            bodyPadding:"10px 0px 0px 10px",
            fieldDefaults:{labelWidth:70},
            defaults:{border:false,bodyPadding:"0 0 0 0",bodyStyle:'background-color:#DFE9F6'},
            items: [
                {xtype: "textareafield", fieldLabel: "活动提示", name: "content",width:550,height:300,value:banner["banner.get"]},//250
                {xtype : 'button',text : '保存',width:60,handler:function(){
                    var formValues = imploadData.form.getValues();
                    var content = formValues["content"];
                    var mCity = Ext.getCmp("city").value||1;
                    LipiUtil.showLoading();
                    if(content == null){
                        Ext.Msg.alert("提示", "空",function(){
                        });
                    }else{
                        LipiUtil.hideLoading();
                        LHttp.post("banner.set",{"content":content,"city":mCity},function(res){
                            if (LipiUtil.errorCheck(res, "banner.set") == false) return;
                            formValues["content"] = res;
                            Ext.Msg.alert("提示", "保存成功！",function(){
                            });
                        });
                    }
                    mWindow.close();
                }}
            ]
        });
        var mWindow = Ext.create("Ext.window.Window", {
            title: title,
            modal: true,
            width: 650,
            height: 400,//420
            fieldDefaults: {labelSeparator: ":"},
            bodyStyle: 'padding:5px 5px 5px 5px',
            items: [
                imploadData
            ]
        });
        mWindow.show();
    }
    var cityComboboxStore = Ext.create("Ext.data.ArrayStore", {
        fields: ["value", "text"],
        data: gData["serverList"]
    });

    var viewStore = Ext.create("Ext.data.ArrayStore", {
        fields: ["activityName", "sTime", "eTime", "name", "arg", "config"],
        data: [],
        listeners:{"onload":function(a,b){
            console.log(a);
            console.log(b);
            return false;
        }}
    });

    var viewTable = Ext.create("Ext.grid.Panel", {
        store: viewStore,
        y: 0,
        tbar: [
            {xtype: 'combobox', fieldLabel: '分区', name: "city", labelWidth: 40, id: "city", width: 160, valueField: "value",
                store: cityComboboxStore, value: "0", editable: false,
                listeners: {select: function () {
                    getActivityList(this.value);
                }}
            },
            {xtype: 'button', text: LipiUtil.t("添加活动"), iconCls: "add", handler: function () {
                showWindow("添加活动", null, function (data) {
                    LipiUtil.showLoading();
                    data["city"] = Ext.getCmp("city").value;
                    LHttp.post("activityConfig.add", data, function (resData) {
                        LipiUtil.hideLoading();
                        if (LipiUtil.errorCheck(resData, "activityConfig.add") == false) return;
                        if(data["city"] == "0"||data["city"] == "all")data["city"] = "全区";
                        Ext.Msg.alert("活动添加成功！影响大区： =>" + JSON.stringify(data["city"]));
                        getActivityList();
                    });
                });
            }},
            {xtype: 'button', text: LipiUtil.t("导入活动"), iconCls: "add", handler: function () {
                importWindow("导入活动");
            }},
            {xtype: 'button', text: LipiUtil.t("导出活动"), iconCls: "settings", handler: function () {
                var aArr = [];
                var rowIndex = viewStore.getCount();
                for(var i=0;i<rowIndex;i++){
                    var record = viewStore.getAt(i);
                    var data = record.data;
                    data["cityList"] = [0];
                    aArr.push(data);
                }
                console.log(JSON.stringify(aArr));
                Ext.Msg.alert("提示", "放不下，往下看\\(\"▔□▔)/");
            }},
            {xtype: 'button', text: LipiUtil.t("运营活动提示"), iconCls: "edit", handler: function () {//za
                var mCity = Ext.getCmp("city").value||1;
                mCity = mCity==0?1:mCity;
                LipiUtil.showLoading();
                LHttp.post("banner.get", {"city":mCity}, function (data) {
                    banner = data;
                    LipiUtil.hideLoading();
                    if (LipiUtil.errorCheck(banner, "banner.get") == false) return;
                    tipsWindow("提示");
                });
            }},
            {xtype: 'button', text: LipiUtil.t("跨服激戰重置數據表"), iconCls: "edit", handler: function () {
                var mCity = Ext.getCmp("city").value || 1;
                mCity = mCity == 0 ? 1 : mCity;
                LipiUtil.showLoading();
                LHttp.jsonp("pvpTopCross.reFormatTable", {"city": mCity}, function (data) {
                    LipiUtil.hideLoading();
                    if (LipiUtil.errorCheck(data, "pvpTopCross.reFormatTable") == false) {
                        return;
                    }
                });
            }}
        ],
        anchor: "100% -355", //shopUid type buyPrice originPrice priceType sTime eTime vip count itemId close
        columns: [
            {text:  LipiUtil.t("活动名"), dataIndex: "activityName", flex: 1},
            {text:  LipiUtil.t("开始时间"), dataIndex: "sTime", flex: 1, renderer: function (v) {
                var dt = new Date((v - 0) * 1000);//活动时间
                var xx = Ext.Date.format(new Date(), 'Y-m-d H:i:s');
                var a1 = Math.floor(new Date(xx).getTime()/1000);
                if(a1 < v){//活动没开始
                    return Ext.Date.format(dt, 'Y-m-d H:i');//font-weight:bold;
                }
                else{//标红，在活动期间内
                    return "<span style='font-weight: bold;color: red'>" + Ext.Date.format(dt, 'Y-m-d H:i')+"</span>";
                }
            }},
            {text:  LipiUtil.t("结束时间"), dataIndex: "eTime", flex: 1, renderer: function (v) {
                var dt = new Date((v - 0) * 1000);//活动结束时间
                var xx = Ext.Date.format(new Date(), 'Y-m-d H:i:s');
                var a2 = Math.floor(new Date(xx).getTime()/1000);
                if(a2 > v){//活动已经结束
                    return Ext.Date.format(dt, 'Y-m-d H:i');//font-weight:bold;
                }
                else{//标红，在活动期间内
                    return "<span style='font-weight: bold;color: red'>" + Ext.Date.format(dt, 'Y-m-d H:i')+"</span>";
                }
            }},
            {text: "NAME", dataIndex: "name", flex: 1},
            {text: LipiUtil.t("参数"), dataIndex: "arg", flex: 1},
            {text: LipiUtil.t("配置"), dataIndex: "config", flex: 1},
            {xtype: "actioncolumn", "text": "编辑", align: "center", items: [
                {
                    iconCls: "add",
                    handler: function (view, row, col, item, e) {
                        var cData = view.store.getAt(row).data;
                        showCopyServerWindow("拷贝活动", cData, function (newData) {
                            if(newData.length == 0) {
                                Ext.Msg.alert("提示", "未选择拷贝区！");
                                return;
                            }
                            LipiUtil.showLoading();
                            cData["cityList"] = newData;
                            LHttp.post("activityConfig.coby", cData, function (data) {
                                LipiUtil.hideLoading();
                                if (LipiUtil.errorCheck(data, "activityConfig.coby") == false) return;
                                Ext.Msg.alert("活动拷贝！影响大区： =>" + JSON.stringify(cData["cityList"]));
                            });
                        });
                    }
                },
                "-",
                {
                    iconCls: "edit",
                    handler: function (view, row, col, item, e) {
                        var cData = view.store.getAt(row).data;
                        var oldName = cData["name"];
                        showWindow("编辑活动", cData, function (newData) {
                            var mName = newData["name"];
                            var mCity = Ext.getCmp("city").value||1;
                            var cc = mCity-0;
                            mCity = mCity==0?1:mCity;
                            if (oldName != mName) return;
                            LipiUtil.showLoading();
                            newData["city"] = mCity;
                            LHttp.post("activityConfig.update", newData, function (data) {
                                LipiUtil.hideLoading();
                                if (LipiUtil.errorCheck(data, "activityConfig.update") == false) return;
                                if(cc == 0||cc == "all")cc = "全区";
                                Ext.Msg.alert("活动编辑成功！影响大区： =>" + JSON.stringify(cc));
                                var mList = data["activityConfig.update"];
                                if (mList != null) viewStore.loadData(mList);
                            });
                        });
                    }
                },
                "-",
                {
                    iconCls: "delete",
                    handler: function (view, row, col, item, e) {
                        var cData = view.store.getAt(row).data;
                        var mCity = Ext.getCmp("city").value;
                        var todelete = function(){
                            Ext.Msg.confirm("提示", "确定删除记录吗？", function (button) {
                                if (button == "yes") {
                                    LipiUtil.showLoading();
                                    LHttp.post("activityConfig.del", cData, function (resData) {
                                        LipiUtil.hideLoading();
                                        if (LipiUtil.errorCheck(resData, "activityConfig.del") == false) return;
                                        Ext.Msg.alert("活动删除成功！影响大区： =>" + JSON.stringify(cData["cityList"]));
                                        var mList = resData["activityConfig.del"];
                                        if (mList != null) viewStore.loadData(mList);
                                    });
                                }
                            });
                        }
                        if(mCity == null || mCity == undefined || mCity == "0"){
                            showDeleteServerWindow("删除活动", function (newData) {
                                if(newData.length == 0) {
                                    Ext.Msg.alert("提示", "未选择拷贝区！");
                                    return;
                                }
                                cData["city"] = "1";
                                cData["cityList"] = newData;
                                todelete();
                            });
                        } else {
                            cData["city"] = mCity;
                            cData["cityList"] = [mCity];
                            todelete();
                        }
                    }
                }
            ]}
        ]
    });

    var viewPanel = Ext.create("Ext.panel.Panel", {
        title:  LipiUtil.t("活动配置"),
        frame: true,//是否渲染表单
        layout: {type: 'fit'},
        items: [viewTable]
    });

    function getActivityList(city) {
        var mCity = city || 1;
        mCity = (mCity == 0) ? 1 : mCity;
        LipiUtil.showLoading();
        LHttp.post("activityConfig.get", {"city": mCity}, function (res) {
            LipiUtil.hideLoading();
            if (res != null) {
                var mList = res["activityConfig.get"];
                if (mList != null) viewStore.loadData(mList);
                else {
                    viewStore.loadData([]);
                }
            }
        });
    }

    getActivityList();

    this.view = viewPanel;
}