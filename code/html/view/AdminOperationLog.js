/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-4-4后台日志操作
 * Time: 下午3:52
 * To change this template use File | Settings | File Templates.
 */
function AdminOperationLog(){
    var logStore = Ext.create("Ext.data.ArrayStore",{ //搜索出来的日志数据
        fields:["model", "userName", "time", "action"],
        data:[]
    });
    var modelStore = Ext.create("Ext.data.ArrayStore",{ //有哪些模块，对应的数据
        fields:["value","text"],
        data:[["1","不限"],["userInfo","用户信息"],["announcement","公告"],["message","邮件"],["messageApply","奖励申请"],["messageApplyList","奖励列表"],["cd-key","CD-KEY"],["shopM","商品管理"],
            ["compensateM","补偿管理"],["activityM","活动管理"],["accountM","账号管理"]]
    });
    function showDetail(title,data){//显示详细信息
        var mWindow = Ext.create("Ext.window.Window", {
            title: title,
            modal: true,
            width: 650,
            height: 420,
            fieldDefaults: {labelSeparator: ":"},
            bodyStyle: 'padding:5px 0px 20px 6px',
            buttons: [
                {xtype: "button", text:LipiUtil.t("确定"), handler: function () {
                    mWindow.close();
                }},
                {xtype: "button", text:LipiUtil.t("取消"), handler: function () {
                    mWindow.close();
                }}
            ],
            items: [
                {
                    xtype: "form",
                    border: false,
                    bodyPadding: 5,
                    id: "detailForm",
                    defaultType: "textfield",
                    bodyStyle: "background:#DFE9F6",
                    fieldDefaults: {labelWidth: 80},
                    items: [
                        {xtype: "textareafield", fieldLabel: "内容",value:data["action"],  width: 600, height: 300}
                    ]
                }
            ]
        });
        mWindow.show();
    }
    var getModelStoreData = function(key){
        var modelData = [["1","不限"],["userInfo","用户信息"],["announcement","公告"],["message","邮件"],["cd-key","CD-KEY"],["shopM","商品管理"],
            ["compensateM","补偿管理"],["activityM","活动管理"],["accountM","账号管理"]]
        var modelL = modelData.length;
        for (var i = 0 ; i < modelL ; i++){
            var item = modelData[i];
            if(item[0] == key){
                return item[1];
                break;
            }
        }
        return "";
    }
    var dealData = function(data){//处理返回的data数据
        var l = data.length;
        for(var i =0 ; i < l ; i++){
            var item = data[i];
            item["model"] = getModelStoreData(item["model"]);
        }
        return data;
    }
    var viewTable = Ext.create("Ext.grid.Panel",{
        store:logStore,
        //        title:"商品 列表",
        y:0,
        //        selModel:selModel,
        tbar:[
            {xtype : 'combobox',fieldLabel : '模块',name:"logModel", labelWidth:40, id:"logModel",  width:160,valueField:"value",
                store:modelStore, value:"1", editable:false
            },
            {xtype:'textfield',fieldLabel:'用户名',labelWidth:40,id:"lName",width:180},
            {
                xtype:"fieldcontainer",
                fieldLabel:'时间',
                layout:{type:'hbox'},
                labelWidth:40,
                items:[
                    {xtype:"datefield", id:"lsTime",value:new Date(new Date().getTime() - 24 * 60 * 60 * 1000 * 1),format: 'Y-m-d'},
                    {xtype: 'splitter'},
                    {xtype:"timefield", id:"lsTime2",value:"08:00",format: 'H:i'}
                ]
            },
            {
                xtype:"fieldcontainer",
                fieldLabel:'至',
                layout:{type:'hbox'},
                labelWidth:40,
                items:[
                    {xtype:"datefield", id:"leTime",value:new Date(),format: 'Y-m-d'},
                    {xtype: 'splitter'},
                    {xtype:"timefield", id:"leTime2",value:"08:00",format: 'H:i'}
                ]
            },
            {xtype:'button',text: LipiUtil.t("搜索"),handler:function(){//搜索日志
                var sendObj = {};
                var newData = {};
                newData["sTime"] = Ext.getCmp("lsTime").value;
                newData["sTime2"] = Ext.getCmp("lsTime2").value;
                newData["eTime"]= Ext.getCmp("leTime").value;
                newData["eTime2"] = Ext.getCmp("leTime2").value;
                var sDate = new Date(newData["sTime"]);
                sDate.setHours(newData["sTime2"].getHours());
                sDate.setMinutes(newData["sTime2"].getMinutes());
                newData["sTime"] = Math.floor(sDate.getTime()/1000);
                var eDate = new Date(newData["eTime"]);
                eDate.setHours(newData["sTime2"].getHours());
                eDate.setMinutes(newData["sTime2"].getMinutes());
                newData["eTime"] = Math.floor(eDate.getTime()/1000);
                sendObj["startTime"] = newData["sTime"];
                sendObj["endTime"]= newData["eTime"];
                sendObj["userName"] = Ext.getCmp("lName").value == null ? "" : Ext.getCmp("lName").value;
                sendObj["logModel"] = Ext.getCmp("logModel").value;
                LipiUtil.showLoading();
                LHttp.post("operationLog.search",sendObj,function(data){
                    LipiUtil.hideLoading();
                    if (LipiUtil.errorCheck(data, "operationLog.search") == false) return;
                    var listData = dealData(data["operationLog.search"]);
                    console.log(JSON.stringify(listData));
                    logStore.loadData(listData);
                })
            }},
            {
                xtype: 'button', text: LipiUtil.t("导出"), handler: function () {//搜索日志
                var sendObj = {};
                var newData = {};
                newData["sTime"] = Ext.getCmp("lsTime").value;
                newData["sTime2"] = Ext.getCmp("lsTime2").value;
                newData["eTime"] = Ext.getCmp("leTime").value;
                newData["eTime2"] = Ext.getCmp("leTime2").value;
                var sDate = new Date(newData["sTime"]);
                sDate.setHours(newData["sTime2"].getHours());
                sDate.setMinutes(newData["sTime2"].getMinutes());
                newData["sTime"] = Math.floor(sDate.getTime() / 1000);
                var eDate = new Date(newData["eTime"]);
                eDate.setHours(newData["sTime2"].getHours());
                eDate.setMinutes(newData["sTime2"].getMinutes());
                newData["eTime"] = Math.floor(eDate.getTime() / 1000);
                sendObj["startTime"] = newData["sTime"];
                sendObj["endTime"] = newData["eTime"];
                sendObj["userName"] = Ext.getCmp("lName").value == null ? "" : Ext.getCmp("lName").value;
                sendObj["logModel"] = Ext.getCmp("logModel").value;
                LipiUtil.showLoading();
                LHttp.post("operationLog.export", sendObj, function (data) {
                    LipiUtil.hideLoading();
                    if (LipiUtil.errorCheck(data, "operationLog.export") == false) return;
                    var listData = dealData(data["operationLog.export"]);
                    var fileName = listData["fileName"];
                    window.open(fileName);
                });
            }
            }
        ],
        anchor:"100% -355", //shopUid type buyPrice originPrice priceType sTime eTime vip count itemId close
        columns:[
                {text: LipiUtil.t("用户名"),dataIndex:"userName",flex:1},
                {text: LipiUtil.t("模块"),dataIndex:"model",flex:1},
                {text: LipiUtil.t("操作日期"),dataIndex:"time",flex:1,renderer:function(v){
                    var dt = new Date((v-0)*1000);
                    return Ext.Date.format(dt, 'Y-m-d H:i');
                }},
                {text: LipiUtil.t("日志内容"),dataIndex:"action",flex:1},
            {xtype: "actioncolumn", "text": "查看", align: "center", items: [
                {
                    iconCls: "edit",

                    handler: function (view, row, col, item, e) {
                        var cData = view.store.getAt(row).data;
                        showDetail("日志内容",cData);
                    }
                }]}
            ]
    });
    var logViewPanel = Ext.create("Ext.panel.Panel",{
        title: LipiUtil.t("活动配置"),
        frame:true,//是否渲染表单
        layout:{type:'fit'},
        items:[viewTable]
    });
    this.view = logViewPanel;
}