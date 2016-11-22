/**
 * User: joseppe
 * Date: 14-11-3
 * Time: 上午11:13
 */


function ServerView() {

    var viewStore = Ext.create("Ext.data.ArrayStore", {
        fields: ["id", "openTime", "name", "isClosed"],
        data: []
    });

    function showWindow(title, data, callbackFn) {
        var mWindow = Ext.create("Ext.window.Window", {
            title: title,
            modal: true,
            width: 450,
            height: 220,
            fieldDefaults: {labelSeparator: ":"},
            bodyStyle: 'padding:5px 0px 20px 6px',
            buttons: [
                {xtype: "button", text: LipiUtil.t("确定"), handler: function () {
                    var newData = Ext.getCmp("mWindowForm").getValues();
                    newData["isClosed"] = newData["isClosed"] == undefined?0:1;
                    var openTime = new Date(newData["openTime"]);
                    var openTimeArray = newData["openTime2"].split(":");
                    openTime.setHours(openTimeArray[0] - 0);
                    openTime.setMinutes(openTimeArray[1] - 0);
                    newData["openTime"] = Math.floor(openTime.getTime() / 1000);
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
                        {xtype: "textfield", fieldLabel: "服务器id", name: "serverId", disabled: true},
                        {xtype: "textfield", fieldLabel: "名称", name: "name", disabled: true},
                        {
                            xtype: "fieldcontainer",
                            fieldLabel: '开服时间',
                            layout: {type: 'hbox'},
                            items: [
                                {xtype: "datefield", name: "openTime", value: new Date(), format: 'Y-m-d'},
                                {xtype: 'splitter'},
                                {xtype: "timefield", name: "openTime2", value: "08:00", format: 'H:i'}
                            ]
                        },
                        {xtype: "checkbox", fieldLabel: "是否关闭", name: "isClosed", boxLabel:"是", checked: false}
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
            newData["serverId"] = data["id"];
            newData["openTime"] = new Date(data["openTime"] * 1000);
            newData["openTime2"] = new Date(data["openTime"] * 1000);//.getHours() + ":" + new Date(data["sTime"] * 1000).getMinutes();
            Ext.getCmp("mWindowForm").form.setValues(newData);
        }
    }

    var viewTable = Ext.create("Ext.grid.Panel", {
        store: viewStore,
        //y: 0,
        //anchor: "100% -355", //shopUid type buyPrice originPrice priceType sTime eTime vip count itemId close
        border: false,
        columns: [
            {text: LipiUtil.t("服务器id"), dataIndex: "id", flex: 1},
            {text: LipiUtil.t("名称"), dataIndex: "name", flex: 1},
            {text: LipiUtil.t("开服时间"), dataIndex: "openTime", flex: 1, renderer: function (v) {
                var dt = new Date((v - 0) * 1000);
                return Ext.Date.format(dt, 'Y-m-d H:i');
            }},
            {text: LipiUtil.t("是否关闭"), dataIndex: "isClosed", flex: 1},
            {xtype: "actioncolumn", "text": LipiUtil.t("编辑"), align: "center", items: [
                {
                    iconCls: "add",
                    handler: function (view, row, col, item, e) {
                        var cData = view.store.getAt(row).data;
                        if(cData.isClosed == 0)
                            return ;
                        LipiUtil.showLoading();
                        LHttp.post("serverlist.update", {"serverId":cData.id, "isClosed":0}, function (data) {
                            LipiUtil.hideLoading();
                            if (LipiUtil.errorCheck(data, "serverlist.update") == false) return;
                            Ext.Msg.alert("提示", "数据保存成功！");
                            var mList = data["serverlist.update"];
                            if (mList != null) viewStore.loadData(mList);
                        });
                    }
                },
                "-",
                {
                    iconCls: "edit",
                    handler: function (view, row, col, item, e) {
                        var cData = view.store.getAt(row).data;
                        showWindow("编辑", cData, function (newData) {
                            LipiUtil.showLoading();
                            newData["serverId"] = cData.id;
                            LHttp.post("serverlist.update", newData, function (data) {
                                LipiUtil.hideLoading();
                                if (LipiUtil.errorCheck(data, "serverlist.update") == false) return;
                                Ext.Msg.alert("提示", "数据保存成功！");
                                var mList = data["serverlist.update"];
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
                        if(cData.isClosed == 1)
                            return ;
                        LipiUtil.showLoading();
                        LHttp.post("serverlist.update", {"serverId":cData.id, "isClosed":1}, function (data) {
                            LipiUtil.hideLoading();
                            if (LipiUtil.errorCheck(data, "serverlist.update") == false) return;
                            Ext.Msg.alert("提示", "数据保存成功！");
                            var mList = data["serverlist.update"];
                            if (mList != null) viewStore.loadData(mList);
                        });
                    }
                }
            ]}
        ]
    });

    var testTable = Ext.create("Ext.form.Panel", {
        frame: true,//是否渲染表单
        layout: {type: "vbox"},
        bodyPadding: "10px 0px 0px 10px",
        fieldDefaults: {labelWidth: 70},
        defaults: {border: false, bodyPadding: "0 0 0 0", bodyStyle: 'background-color:#DFE9F6'},
        items: [{
            layout:{type:"absolute"},
            items:getTestServer()
	    }]
    });

    var onlineTable = Ext.create("Ext.form.Panel", {
        frame: true,//是否渲染表单
        layout: {type: "vbox"},
        bodyPadding: "10px 0px 0px 10px",
        fieldDefaults: {labelWidth: 70},
        defaults: {border: false, bodyPadding: "0 0 0 0", bodyStyle: 'background-color:#DFE9F6'},
        items: [{
            layout:{type:"absolute"},
            items:getOnlineServer()
        }]
    });

    var topPanel = Ext.create("Ext.tab.Panel", {
        items: getItem()
    });

    function getServerList(){
        LHttp.post("server.list", null, function(res){
            if (res != null) {
                var mList = res["server.list"];
                if (mList != null) viewStore.loadData(mList);
            } else {
                viewStore.loadData([]);
                Ext.Msg.alert("提示", "取服务器列表");
            }
        });
    }

    function sendData(method, idpre){
        //var country = Ext.util.Cookies.get("country") == null ? "" : Ext.util.Cookies.get("country");
        var location = Ext.getCmp("location"+idpre) == undefined?'':Ext.getCmp("location"+idpre).value;
        LipiUtil.showLoading("正在执行<br />请耐心。。。。。<br />再耐心些。。。。");
        LHttp.post("server.run", {"run":method, "location":location}, function (data) {
            LipiUtil.hideLoading();
            if (LipiUtil.errorCheck(data, "server.run") == false) return;
            if(data["server.run"]["status"] == 1)
                if(data["server.run"]["url"] != null){
                    Ext.Msg.alert("提示", "执行完毕! 差别文件包: http://dbztest.gt.com/diff/" + data["server.run"]["url"]);
                }else{
                    Ext.Msg.alert("提示", "执行完毕!");
                }
            else{
                if(data["server.run"]["err"] != undefined)
                    console.log(data["server.run"]["err"]);
                Ext.Msg.alert("提示", "执行出错!");
            }
        });
    }

    function getItem(){
        var items = [];

        items.push({layout:{type:'fit'}, title: LipiUtil.t("开服管理"), items: [viewTable]});
        if(LHttp.isTest() || LHttp.isDev()){
            items.push({layout:{type:'fit'},title: LipiUtil.t("管理服务器"),items: [testTable]});
            items.push({layout:{type:'fit'},title: LipiUtil.t("发布服务器"),items: [onlineTable]});
        }
        return items;
    }

    function getTestServer(){
        var language = [];
        getConturyDiff(language, '1');
        language.push({xtype: 'button', text: LipiUtil.t('前端更新'), width: 60, x: 0, y: 45, handler: function () {sendData("svncodeup", '1');}});
        language.push({xtype: 'button', text: LipiUtil.t('前端分离'), width: 60, x: 100, y: 30, handler: function () {sendData("codefenli", '1');}});
        language.push({xtype: 'button', text: LipiUtil.t('前端打包'), width: 60, x: 100, y: 60, handler: function () {sendData("codepacket", '1');}});
        language.push({xtype: 'button', text: LipiUtil.t('更新版本号'), width: 100, x: 200, y: 45, handler: function () {sendData("versiondev", '1');}});
        language.push({xtype: 'button', text: LipiUtil.t('后端更新'), width: 60, x: 0, y: 130, handler: function () {sendData("svnnodeup", '1');}});
        language.push({xtype: 'button', text: LipiUtil.t('后端覆盖'), width: 60, x: 100, y: 130, handler: function () {sendData("overwritenode", '1');}});
        language.push({xtype: 'button', text: LipiUtil.t('后端重启'), width: 60, x: 200, y: 130, handler: function () {sendData("noderestart", '1');}});
        language.push({xtype: 'button', text: LipiUtil.t('一键更新发布测试服'), width: 150, height:60, x: 30, y: 200, handler: function () {sendData("doalltest", '1');}});
        return language;
    }

    function getOnlineServer(){
        var language = [];
        getConturyDiff(language, '2');
        language.push({xtype: 'button', text: LipiUtil.t('封版本'), width: 60, x: 0, y: 45, handler: function () {sendData("rsyncall", '2');}});
        language.push({xtype: 'button', text: LipiUtil.t('发布前端'), width: 60, x: 100, y: 45, handler: function () {sendData("publishcode", '2');}});
        language.push({xtype: 'button', text: LipiUtil.t('白名单'), width: 60, x: 200, y: 45, handler: function () {sendData("versiontest", '2');}});
        language.push({xtype: 'button', text: LipiUtil.t('对外'), width: 60, x: 300, y: 45, handler: function () {sendData("versionline", '2');}});
        language.push({xtype: 'button', text: LipiUtil.t('发布后端'), width: 60, x: 400, y: 45, handler: function () {sendData("publishnode", '2');}});
        language.push({xtype: 'button', text: LipiUtil.t('一键更新发布正式服'), width: 150, height:60, x: 30, y: 200, handler: function () {sendData("doallline", '2');}});
        return language;
    }

    function getConturyDiff(language, idpre){
        var locationComboboxStore;
        //var language = [];
        if(LHttp.country == 'h'){
            locationComboboxStore = Ext.create("Ext.data.ArrayStore", {
                fields: ["value", "text"],
                data: [["EN","英文安卓"],["ENIOS","英文ios"],["EN,ENTW","英文双语"]]
            });
            language.push({xtype: 'combobox', fieldLabel: '地区', name: "location", labelWidth: 30, id: "location"+idpre, width: 160,x:0,y:0, valueField: "value", store:locationComboboxStore, value: "EN", editable: false });
        } else if(LHttp.country == 'j'){
            locationComboboxStore = Ext.create("Ext.data.ArrayStore", {
                fields: ["value", "text"],
                data: [["THAI","泰文安卓"],["THAIIOS","泰文IOS"]]
            });
            language.push({xtype: 'combobox', fieldLabel: '地区', name: "location", labelWidth: 30, id: "location"+idpre, width: 160,x:0,y:0, valueField: "value", store:locationComboboxStore, value: "THAI", editable: false });
        }
    }

    getServerList();

    this.view = topPanel;
}
