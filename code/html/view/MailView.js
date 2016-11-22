/**
 * Created with JetBrains WebStorm.
 * User: apple
 * Date: 13-7-22
 * Time: 下午9:00
 * To change this template use File | Settings | File Templates.
 */

//邮件功能

function MailView(){
    function showDetail(title,data){//显示详细信息
        var mWindow = Ext.create("Ext.window.Window", {
            title: title,
            modal: true,
            width: 650,
            height: 420,
            fieldDefaults: {labelSeparator: ":"},
            bodyStyle: 'padding:5px 0px 20px 6px',
            buttons: [
                {xtype: "button", text: LipiUtil.t("确定"), handler: function () {
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
    var logStore = Ext.create("Ext.data.ArrayStore",{ //搜索出来的日志数据
        fields:["model", "userName", "time", "action"],
        data:[]
    });

    var viewTable = Ext.create("Ext.grid.Panel", {
        store: logStore,
        y: 0,
        border:false,
        tbar: [
            {xtype: 'button', text: LipiUtil.t('添加邮件'), iconCls: "add", handler: function () {
                showWindow("添加邮件", null);
            }},
            {xtype: 'button', text: LipiUtil.t('导入邮件'), iconCls: "add", handler: function () {
                showWindow("导入邮件", null);
            }}
        ],

        anchor: "100% -355", //shopUid type buyPrice originPrice priceType sTime eTime vip count itemId close
        columns: [
            {text:LipiUtil.t("用户名"),dataIndex:"userName",flex:1},
            {text:LipiUtil.t("模块"),dataIndex:"model",flex:1},
            {text:LipiUtil.t("操作日期"),dataIndex:"time",flex:1,renderer:function(v){
                var dt = new Date((v-0)*1000);
                return Ext.Date.format(dt, 'Y-m-d H:i');
            }},
            {text:LipiUtil.t("日志内容"),dataIndex:"action",flex:1},
            {xtype: "actioncolumn", "text": LipiUtil.t("查看"), align: "center", items: [
                {
                    iconCls: "edit",

                    handler: function (view, row, col, item, e) {
                        var cData = view.store.getAt(row).data;
                        showDetail("日志内容",cData);
                    }
                }]}
        ]
    });

    var viewPanel = Ext.create("Ext.panel.Panel", {
        title:LipiUtil.t("系统邮件"),
        frame: true,//是否渲染表单
        layout: {type: 'fit'},
        //items: [viewTable]
        items: [viewTable]
    });

    var sendMailForm = function(callBack){
        var isSend = false;
        var sendMail = Ext.create("Ext.form.Panel",{
            frame:true,//是否渲染表单
            layout:{type:"vbox"},
            bodyPadding:"10px 0px 0px 10px",
            fieldDefaults:{labelWidth:70},
            defaults:{border:false,bodyPadding:"0 0 0 0",bodyStyle:'background-color:#DFE9F6'},
            items:[
                {xtype : 'textareafield',fieldLabel : '接收者ID',id:"receiverId",name:"receiverId",width:500,height:40},
                {xtype : 'textareafield',fieldLabel : '内容',id:"message",name:"message",width:500,height:60},
                {xtype : 'textareafield',fieldLabel : '物品',id:"reward",name:"reward",width:500,height:60},
                {xtype : 'textfield',id:"id",name:"id",hidden: true,hideLabel:true},
                {
                    layout:{type:"absolute"},
                    items:[
                        {xtype : 'button',text : LipiUtil.t('发送'),width:60,x:150,y:20,handler:function(){
                            if(isSend) return;
                            var formValues = sendMail.form.getValues();
                            formValues["receiverId"] = formValues["receiverId"].toString().replace(/，/g,',');
                            formValues["reward"] = Ext.String.trim(formValues["reward"]);
                            if (formValues["reward"] == "") {
                                formValues["type"] = "mail";
                            } else {
                                formValues["type"] = "gift";
                                try {
                                    var mArray = JSON.parse(formValues["reward"])
                                    if (mArray instanceof Array) {
                                        if (mArray.length == 0) throw new Error("err");
                                        for (var i = 0 ; i < mArray.length; i++) {
                                            if (mArray[i]["id"] == null) throw new Error("err");
                                        }
                                    } else {
                                        throw new Error("err");
                                    }
                                } catch (err) {
                                    Ext.Msg.alert("提示", "物品格式错误!");
                                    return;
                                }
                            }
                            LipiUtil.showLoading();
                            isSend = true;
                            LHttp.post("mail.send",formValues,function(data){
                                LipiUtil.hideLoading();
                                isSend = false;
                                if (LipiUtil.errorCheck(data, "mail.send") == false) return;
                                var mObj = data["mail.send"];
                                for (var key in mObj) {
                                    if (mObj[key] == 0) {
                                        Ext.Msg.alert("提示", JSON.stringify(mObj));
                                        sendMail.form.reset();
                                        return;
                                    }
                                }
                                callBack();
                                Ext.Msg.alert("提示", "保存成功！");
                                //sendMail.form.reset();
                            });
                        }},
                        {xtype : 'button',text : LipiUtil.t('拒绝'),width:60,x:300,y:20,handler:function(){


                            if(isSend) return;
                            var formValues = sendMail.form.getValues();

                            if(formValues["id"]=="") return;

                            LipiUtil.showLoading();
                            isSend = true;

                            LHttp.post("mail.apply", {"id": formValues["id"], "action": "cancel"}, function (data) {
                                LipiUtil.hideLoading();
                                isSend = false;
                                if (LipiUtil.errorCheck(data) == false) return;
                                var returnData = data["mail.apply"];
                                if (returnData["ERROR"] != null) {
                                    Ext.Msg.alert("提示", returnData["info"]);
                                } else {
                                    callBack();
                                }
                            });
                        }}
                    ]
                },
                {xtype: "label", height:30},
                {xtype: "label", text: LipiUtil.t('接收者ID用,号分隔; 内容为发给玩家的信息,格式为纯文本; '), style:'color:#999'},
                {xtype: "label" , text: LipiUtil.t('物品为发给玩家的物品, 格式为[{"id":"xxx", "count":[数量], "isPatch":[是否碎片],"level":[等级]}] ,除了id,其它参数，根据需要可选'), style:'color:#999'}
            ]
        });

        if(applyRowData != null){
            Ext.getCmp("id").setValue(applyRowData["id"]);
            Ext.getCmp("receiverId").setValue(applyRowData["receiverIds"]);
            Ext.getCmp("message").setValue(applyRowData["mailMessage"]);
            Ext.getCmp("reward").setValue(applyRowData["mailReward"]);
        }

        return sendMail;
    }
    //批量发放邮件
    var imploadMailForm = function(callBack){
        var imploadMail = Ext.create("Ext.form.Panel",{
            fileUpload:true,
            frame:true,//是否渲染表单
            layout:{type:"vbox"},
            bodyPadding:"10px 0px 0px 10px",
            fieldDefaults:{labelWidth:70},
            defaults:{border:false,bodyPadding:"0 0 0 0",bodyStyle:'background-color:#DFE9F6'},
            items:[
                {xtype : 'textareafield',fieldLabel : '批量文本',name:"content",width:550,height:250},
                {xtype : 'button',text : LipiUtil.t('校验发送'),width:60,handler:function(){
                    var formValues = imploadMail.form.getValues();
                    var content = formValues["content"];
                    LipiUtil.showLoading();
                    try {
                        var mArray = JSON.parse(content)
                        if (mArray instanceof Array) {
                            if (mArray.length == 0) throw new Error("空数组");
                            for (var i in mArray) {
                                var formValue = mArray[i];
                                formValue["receiverId"] = formValue["receiverId"].replace(/，/g,',');
                                if(formValue["receiverId"] == ""){
                                    throw new Error("i:"+i+", receiverId为空");
                                }
                                if (formValue["reward"] == "") {
                                    formValue["type"] = "mail";
                                } else {
                                    formValue["type"] = "gift";
                                    var mmArray = JSON.parse(formValue["reward"])
                                    if (mmArray instanceof Array) {
                                        if (mmArray.length == 0) throw new Error("i:"+i+", reward格式错误");
                                        for (var j in mmArray) {
                                            if (mmArray[j]["id"] == ""){
                                                throw new Error("i:"+i+",j:"+j+", reward id 为空");
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            throw new Error("格式错误");
                        }
                    } catch (err) {
                        LipiUtil.hideLoading();
                        console.log(err.message);
                        Ext.Msg.alert("提示", "物品格式错误!");
                        return;
                    }
                    //LipiUtil.hideLoading();
                    var j = 1;
                    for (var i in mArray) {
                        formValue = mArray[i];
                        //formValue['reward'] = JSON.stringify(formValue['reward']);
                        LHttp.post("mail.send",formValue,function(data){
                            LipiUtil.hideLoading();
                            if (LipiUtil.errorCheck(data, "mail.send") == false) return;
                            var mObj = data["mail.send"];
                            for (var key in mObj) {
                                if (mObj[key] == 0) {
                                    Ext.Msg.alert("提示", JSON.stringify(mObj));
                                    imploadMail.form.reset();
                                    return;
                                }
                            }
                            if(j++ >= mArray.length){
                                callBack();
                                Ext.Msg.alert("提示", "保存成功！");
                            }
                        });
                    }
                }},
                {xtype: "label", height:30},
                {xtype: "label", text: LipiUtil.t('示例格式如下，内容说明参考《添加邮件》'), style:'color:#999'},
                {xtype: "label" , text: '[{"receiverId":"123,456,789","reward":"[{\\"id\\":\\"123\\",\\"count\\":\\"123\\",\\"isPatch\\":\\"1\\",\\"level\\":\\"2\\"}]","message":"xiaoxi"}]', style:'color:#999', width:550}
            ]
        });
        return imploadMail;
    }
    var showWindow = function(title,data){
        if(title == '导入邮件'){
            applyRowData = null;
            var winform = imploadMailForm(function(){
                mWindow.close();
            });
        }  else if(title == '通过申请'){
            var winform = sendMailForm(function(){
                searchButtonClick();
                mWindow.close();
            });
        }else {
            applyRowData = null;
            var winform = sendMailForm(function () {
                mWindow.close();
            });
        }
        var mWindow = Ext.create("Ext.window.Window", {
            title: title,
            modal: true,
            width: 650,
            height: 420,
            fieldDefaults: {labelSeparator: ":"},
            bodyStyle: 'padding:5px 5px 5px 5px',
            items: [
                winform
            ]
        });
        mWindow.show();
    };
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
    function getMailList() {
        var sendObj = {};
        sendObj["startTime"] = Math.floor((new Date()).getTime() / 1000 - 24 * 5 * 60 * 60);
        sendObj["endTime"] = Math.floor((new Date()).getTime() / 1000 + 24 * 1 * 60 * 60);
        sendObj["userName"] = '';
        sendObj["logModel"] = 'message';
        LipiUtil.showLoading();
        LHttp.post("operationLog.search",sendObj,function(data){
            LipiUtil.hideLoading();
            if (LipiUtil.errorCheck(data, "operationLog.search") == false) return;
            var listData = dealData(data["operationLog.search"]);
            logStore.loadData(listData);
        })
    }

    getMailList();
    this.view = viewPanel;
}