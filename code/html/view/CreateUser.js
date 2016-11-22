/**
 * Created with JetBrains WebStorm.
 * User: jichang创建用户
 * Date: 14-4-1
 * Time: 上午11:40
 * To change this template use File | Settings | File Templates.
 */
function CreateUser(){
    function cancellation(){ //注销
        Ext.util.Cookies.clear("uid");
        Ext.util.Cookies.clear("pw");
        location="javascript:location.reload()";
    }
    function createUserHandler(){//创建用户
        LipiUtil.showLoading();
        LHttp.post("createUser.add",{},function(data){ //检测是否可以创建用户
            LipiUtil.hideLoading();
            if (data["createUser.add"] == null) {
              Ext.Msg.alert("提示", "返回错误");
              return;
           }

           if(data["createUser.add"]["ERROR"] != null) {
              Ext.Msg.alert("提示", data["createUser.add"]["info"]);
               return;
           }
            var myCheckboxGroup = new Ext.form.CheckboxGroup({
                xtype: 'checkboxgroup',
                name: 'aaa',
                width: 572,
                height: 220,
                columns: 3,
                align:"center",
                items: [
                    {boxLabel: '登录权限', name: 'login',checked: false},
                    {boxLabel: '查看用户信息', name: 'userView',checked: false},
                    {boxLabel: '更改用户信息', name: 'userModify',checked: false},
                    {boxLabel: '创建管理员', name: 'createAdmin',checked: false},
                    {boxLabel: '发送礼物', name: 'sendGift',checked: false},
                    {boxLabel: '修改商品数据', name: 'shop',checked: false},
                    {boxLabel: '发送信息', name: 'sendMail',checked: false},
                    {boxLabel: '奖励申请',name:'applyMail',checked: false},
                    {boxLabel: '奖励列表',name:'applyMailList',checked: false},
                    {boxLabel: '公告处理', name: 'notice',checked: false},
                    {boxLabel: '开服管理', name: 'serverModify',checked: false},
                    {boxLabel: '查看统计信息', name: 'statistic',checked: false}
                ]
            });
            var typeComboboxStore = Ext.create("Ext.data.ArrayStore",{
                fields:["value","text"],
                data:[[0,"无权限"],[1,"管理员"],[2,"运营"],[3,"策划"],[4,"程序"]]
            });
            var authorizeId = 0;//用户权限
            var toolbar = Ext.create("Ext.toolbar.Toolbar",{
                items:[
                    {xtype:'textfield',fieldLabel:'用户ID',width:130,labelWidth:40},
                    {xtype:'textfield',inputType: 'password',width:130,fieldLabel:'用户密码',labelWidth:55},
                    {xtype:'textfield',fieldLabel:'分组',width:80,labelWidth:30,value:'all'},
                    {xtype:'textfield',fieldLabel:'渠道',width:80,labelWidth:30,value:'all'},
                    {xtype:'combobox',fieldLabel:'分配权限',width:130,labelWidth:55,valueField:"value",
                        store:typeComboboxStore,value:0,editable:false,
                        listeners:{select:function(){
                            var value = this.value;
                            authorizeId = value;
                            LipiUtil.showLoading();
                            LHttp.post("authorize.get",{"authorizeId":value},function(data){ //检测权限
                                LipiUtil.hideLoading();
                                if (data["authorize.get"] == null) {
                                    Ext.Msg.alert("提示", "返回错误");
                                    return;
                                }

                                if(data["authorize.get"]["ERROR"] != null) {
                                    Ext.Msg.alert("提示", data["authorize.get"]["info"]);
                                    return;
                                }
                                var serverData = data["authorize.get"]["authorize"];
                                var checkGroup = myCheckboxGroup.items;
                                var checkL = checkGroup.length;
                                for(var j = 0 ; j < checkL ; j ++){
                                    var item = checkGroup.get(j);
                                    var name = item.name;
                                    var checked = (serverData[name] && serverData[name] == 1) ? true : false;
                                    item.setValue(checked);
                                }
                            });
                        }}
                    }
                ]
            })
            var aindow = Ext.create("Ext.window.Window",{
                title:LipiUtil.t("创建新用户"),
                modal:true,
                width:572,
                height:220,
                tbar:toolbar,
                items : [myCheckboxGroup],
                buttons:[
                    {xtype:"button",text:LipiUtil.t("确定"),handler:function(){
                        var checkBoxGroup = myCheckboxGroup.items;
                        var checkL = checkBoxGroup.length;
                        var postData = {};
                        for(var i = 0 ; i < checkL ; i ++){
                            var item = checkBoxGroup.get(i);
                            var name = item.name;
                            var checked = item.checked;
                            postData[name] = checked == true ? 1 : 0;
                        }
                        var tbar = toolbar.items;
                        postData["userName"] =  tbar.items[0].getValue();
                        postData["passWord"] =  tbar.items[1].getValue();
                        postData["group"] =  tbar.items[2].getValue();
                        postData["channel"] =  tbar.items[3].getValue();
                        LipiUtil.showLoading();
                        LHttp.post("createUser.add",postData,function(data){ //创建用户
                            LipiUtil.hideLoading();
                            if (data["createUser.add"] == null) {
                                Ext.Msg.alert("提示", "返回错误");
                                return;
                            }

                            if(data["createUser.add"]["ERROR"] != null) {
                                Ext.Msg.alert("提示", data["createUser.add"]["info"]);
                                return;
                            }
                            Ext.Msg.alert("提示", "创建成功");
                            getUserList();
                            aindow.close();
                        });
                    }},
                    {xtype:"button",text:LipiUtil.t("取消"),handler:function(){
                        aindow.close();
                    }}
                ]
            });
            aindow.show();
       });
    }
    function changePw(){ //修改密码
        var changePwWindow =  Ext.create("Ext.window.Window",{
            title:LipiUtil.t("修改密码"),
            modal:true,
            width:280,
            height:200,
            items:[
                this.promptContainer = new Ext.container.Container({
                    style:{padding : '30px'},
                    items:[
                        {xtype : 'textfield',inputType: 'password',id:"oldPw", fieldLabel : '旧密码',name:"receiverId",width:200,height:20},
                        {xtype : 'textfield',inputType: 'password',id:"newPw", fieldLabel : '新密码',name:"receiverId",width:200,height:20},
                        {xtype : 'textfield',inputType: 'password',id:"confirmPw", fieldLabel : '确认密码',name:"receiverId",width:200,height:20}
                    ]
                })
            ],
            buttons:[
                {xtype:'button' , text:LipiUtil.t('确定'),handler:function(){
                    var oldPw = Ext.getCmp("oldPw");
                    var newPw = Ext.getCmp("newPw");
                    var confirmPw = Ext.getCmp("confirmPw");
                    if(newPw.getValue() == "" || confirmPw.getValue() == "" || oldPw.getValue() == "") {
                        Ext.Msg.alert("提示", "密码不能为空");
                        return;
                    }
                    if(newPw.getValue() != confirmPw.getValue()){
                        Ext.Msg.alert("提示", "确认密码与新密码不同请重新输入");
                        newPw.setValue("");
                        oldPw.setValue("");
                        confirmPw.setValue("");
                    }else{
                        var sendObj = {};
                        sendObj["userName"] = Ext.util.Cookies.get("name");
                        sendObj["oldPw"] = oldPw.getValue();
                        sendObj["newPw"] = newPw.getValue();
                        sendObj["country"] = Ext.util.Cookies.get("country");
                        LipiUtil.showLoading();
                        LHttp.post("change.pw",sendObj,function(data){ //创建用户
                            LipiUtil.hideLoading();
                            changePwWindow.close();
                            if(data["change.pw"]["ERROR"] != null) {
                                Ext.Msg.alert("提示", "密码修改失败");
                                return;
                            }
                            Ext.Msg.alert("提示", "密码修改成功");
                        });
                    }
                }},
                {xtype:'button' , text:LipiUtil.t('取消'),handler:function(){
                    changePwWindow.close();
                }}
            ]
        });
        changePwWindow.show();
    }
    var userStore = Ext.create("Ext.data.ArrayStore",{
        fields:["uid", "name", "login", "userView", "userModify", "createAdmin", "sendGift", "shop", "sendMail", "applyMail", "applyMailList", "notice", "serverModify", "statistic", "group", "channel"],
        data:[]
    });

    /**
     * 修改用户信息窗口
     */
    function showChangeUserWindow(data,callBack){
        var myCheckboxGroup = new Ext.form.CheckboxGroup({
            xtype: 'checkboxgroup',
            name: 'aaa',
            width: 572,
            height: 220,
            columns: 3,
            align:"center",
            items: [
                {boxLabel: '登录权限', name: 'login',checked: false},
                {boxLabel: '查看用户信息', name: 'userView',checked: false},
                {boxLabel: '更改用户信息', name: 'userModify',checked: false},
                {boxLabel: '创建管理员', name: 'createAdmin',checked: false},
                {boxLabel: '发送礼物', name: 'sendGift',checked: false},
                {boxLabel: '修改商品数据', name: 'shop',checked: false},
                {boxLabel: '发送信息', name: 'sendMail',checked: false},
                {boxLabel:"奖励申请",name:"applyMail",checked: false},
                {boxLabel: '奖励列表',name:'applyMailList',checked: false},
                {boxLabel: '公告处理', name: 'notice',checked: false},
                {boxLabel: '开服管理', name: 'serverModify',checked: false},
                {boxLabel: '查看统计信息', name: 'statistic',checked: false}
            ]
        });
        var typeComboboxStore = Ext.create("Ext.data.ArrayStore",{
            fields:["value","text"],
            data:[[0,"无权限"],[1,"管理员"],[2,"运营"],[3,"策划"],[4,"程序"]]
        });
        var toolbar = Ext.create("Ext.toolbar.Toolbar",{
            items:[
                {xtype:'textfield',fieldLabel:'分组',width:80,labelWidth:30,value:'all'},
                {xtype:'textfield',fieldLabel:'渠道',width:80,labelWidth:30,value:'all'},
                {xtype:'combobox',fieldLabel:'分配权限',width:130,labelWidth:55,valueField:"value",
                    store:typeComboboxStore,value:0,editable:false,
                    listeners:{select:function(){
                        var value = this.value;
                        authorizeId = value;
                        LipiUtil.showLoading();
                        LHttp.post("authorize.get",{"authorizeId":value},function(data){ //检测权限
                            LipiUtil.hideLoading();
                            if (data["authorize.get"] == null) {
                                Ext.Msg.alert("提示", "返回错误");
                                return;
                            }

                            if(data["authorize.get"]["ERROR"] != null) {
                                Ext.Msg.alert("提示", data["authorize.get"]["info"]);
                                return;
                            }
                            var serverData = data["authorize.get"]["authorize"];
                            var checkGroup = myCheckboxGroup.items;
                            var checkL = checkGroup.length;
                            for(var j = 0 ; j < checkL ; j ++){
                                var item = checkGroup.get(j);
                                var name = item.name;
                                var checked = (serverData[name] && serverData[name] == 1) ? true : false;
                                item.setValue(checked);
                            }
                        });
                    }}
                }
            ]
        })
        var upwindow = Ext.create("Ext.window.Window",{
            title:LipiUtil.t("修改管理员信息"),
            modal:true,
            width:572,
            height:220,
            tbar:toolbar,
            items:[myCheckboxGroup],
            buttons:[
                {xtype:"button",text:LipiUtil.t("确定"),handler:function(){
                    var checkBoxGroup = myCheckboxGroup.items;
                    var checkL = checkBoxGroup.length;
                    var postData = {};
                    for(var i = 0 ; i < checkL ; i ++){
                        var item = checkBoxGroup.get(i);
                        var name = item.name;
                        var checked = item.checked;
                        postData[name] = checked == true ? 1 : 0;
                    }
                    //postData["authorize"] = sendObjAuthorize;
                    var tbar = toolbar.items;
                    postData["group"] =  tbar.items[0].getValue();
                    postData["channel"] =  tbar.items[1].getValue();
                    callBack(postData);
                    upwindow.close();
                }},
                {xtype:"button",text:LipiUtil.t("取消"),handler:function(){
                    upwindow.close();
                }}
            ]
        });
        var checkGroup = myCheckboxGroup.items;
        var checkL = checkGroup.length;
        for(var j = 0 ; j < checkL ; j ++){
            var item = checkGroup.get(j);
            var name = item.name;
            var checked = (data[name] && data[name] == 1) ? true : false;
            item.setValue(checked);
        }
        toolbar.items.get(0).setValue(data['group']);
        toolbar.items.get(1).setValue(data['channel']);
        upwindow.show();
    }
    /**
     * 用户数据表
     * @type {*}
     */
    var userTable = Ext.create("Ext.grid.Panel",{ //用户数据表
        store:userStore,
        y:0,
        anchor:"100%",
        columns:[
            {text:LipiUtil.t("uid"),dataIndex:"uid",flex:1},
            {text:LipiUtil.t("用户名"),dataIndex:"name",flex:1},
            {text:LipiUtil.t("登录权限"),dataIndex:"login",flex:1},
            {text:LipiUtil.t("查看用户信息"),dataIndex:"userView",flex:1},
            {text:LipiUtil.t("更改用户信息"),dataIndex:"userModify",flex:1},
            {text:LipiUtil.t("创建管理员"),dataIndex:"createAdmin",flex:1},
            {text:LipiUtil.t("发送礼物"),dataIndex:"sendGift",flex:1},
            {text:LipiUtil.t("商店"),dataIndex:"shop",flex:1},
            {text:LipiUtil.t("发送信息"),dataIndex:"sendMail",flex:1},
            {text:LipiUtil.t("奖励申请"),dataIndex:"applyMail",flex:1},
            {text:LipiUtil.t("奖励列表"),dataIndex:'applyMailList',flex:1},
            {text:LipiUtil.t("公告处理"),dataIndex:"notice",flex:1},
            {text:LipiUtil.t("开服管理"),dataIndex:"serverModify",flex:1},
            {text:LipiUtil.t("查看统计信息"),dataIndex:"statistic",flex:1},
            {text:LipiUtil.t("分组"),dataIndex:"group",flex:1},
            {text:LipiUtil.t("渠道"),dataIndex:"channel",flex:1},
            {xtype:"actioncolumn","text":"编辑",align:"center",items:[{
                iconCls:"edit",
                handler:function(view,row,col,item,e){
                    var cData = view.store.getAt(row).data;
                    showChangeUserWindow(cData, function(adata) {
                        LipiUtil.showLoading();
                        adata["changeUid"] = cData["uid"];
                        LHttp.post("admin.update", adata, function(data){
                            LipiUtil.hideLoading();
                            if (LipiUtil.errorCheck(data, "admin.update") == false) return;
                            Ext.Msg.alert("提示", "数据保存成功！");
                            var shopList = data["admin.update"];
                            if (shopList != null) userStore.loadData(shopList);
                        });
                    });
                }
            }, "-", {
                iconCls:"delete",
                handler:function(view,row,col,item,e){
                    var cData = view.store.getAt(row).data;
                    Ext.Msg.confirm("提示", "确定删除记录吗？", function(button) {
                        if (button == "yes") {
                            LipiUtil.showLoading();
                            var ss = {};
                            ss["changeUid"] = cData["uid"];
                            LHttp.post("admin.delete", ss, function(resData){
                                LipiUtil.hideLoading();
                                if (LipiUtil.errorCheck(resData, "admin.delete") == false) return;
                                var mList = resData["admin.delete"];
                                if (mList != null) userStore.loadData(mList);
                                Ext.Msg.alert("提示", "数据删除成功！");
                            });
                        }
                    });
                }
            }]}
        ]
    });

    var userInfo = Ext.create('Ext.panel.Panel',{
        layout:{type:"fit"},
        frame:true,
        title:LipiUtil.t("账号管理中心"),
        tbar:[
            {xtype:'label',text:"当前用户：" + Ext.util.Cookies.get("name")},
            {xtype:'button',text:'注销',id:"cancellationButton",iconCls:"settings",handler:cancellation},
            {xtype:'button',text:'修改密码',id:"changePassWord",iconCls:"settings",handler:changePw},
            {xtype:'button',text:'创建用户',id:"createUserButton",iconCls:"settings",handler:createUserHandler}
        ],
        items:[userTable]
    });
    function getUserList(){//获取用户信息
        LipiUtil.showLoading();
        LHttp.post("admin.list",{},function(data){//获取用户信息列表
            LipiUtil.hideLoading();
            if (data != null) {
                var mList = data["admin.list"];
                if (mList != null) userStore.loadData(mList);
            }
        });
    }
    getUserList();
    this.view = userInfo;
}