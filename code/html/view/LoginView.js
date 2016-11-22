/**
 * Created with JetBrains WebStorm.
 * User: apple
 * Date: 13-7-18
 * Time: 下午5:40
 * To change this template use File | Settings | File Templates.
 */

function LoginView(loginCompCallBack){

    var loginCompCallFn = loginCompCallBack;

    function resetButtonClick() {
        form.getForm().reset();
    }

    function loginButtonClick() {
        var formData = form.getForm().getValues();
        LipiUtil.showLoading();
        LHttp.post("admin.login",formData,function(data){
            LipiUtil.hideLoading();
            if (LipiUtil.errorCheck(data, "admin.login") == false) return;
            if (data["admin.login"] == null) {
                Ext.Msg.alert("提示", "返回错误");
                return;
            }

            if(data["admin.login"]["ERROR"] != null) {
                Ext.Msg.alert("提示", data["admin.login"]["ERROR"]);
            } else {
                loginCompCallFn(data["admin.login"], formData);
            }
        });

//        LHttp.post("user.getToken",{username:"lipi",password:"1234"},function(data){
//            console.log(data);
//        });
    }

    //回车处理
    function specialkeyHandler(field, e) {
        if (e.getKey() == Ext.EventObject.ENTER) {
            loginButtonClick();
        }
    }

    var typeComboboxStore = Ext.create("Ext.data.ArrayStore",{
        fields:["value","text"],
        data:platformData
    });
    var languageComboboxStore = Ext.create("Ext.data.ArrayStore",{
        fields:["value","text"],
        data:languageData
    });
    var cashName = Ext.util.Cookies.get("name") == null ? "" : Ext.util.Cookies.get("name");
    var cashServer = Ext.util.Cookies.get("country") == null ? platformData[0][0] : Ext.util.Cookies.get("country");
    var language = Ext.util.Cookies.get("language") == null ? languageData[0][0] : Ext.util.Cookies.get("language");
    var form = Ext.create("Ext.form.Panel",{
        labelAlign: 'right',
        frame: true,
        buttonAlign: 'center',
        border:false,
        fieldDefaults:{anchor:0,labelWidth:60,labelSeparator:":"},
        bodyStyle: 'padding:10px 40px 0px 6px',
        layout:{type:"vbox",defaultMargins:{bottom:6}},
        items: [
            {xtype : 'textfield',fieldLabel : LipiUtil.t('用户名'),name: 'name',value:cashName,listeners:{specialkey:specialkeyHandler}},
            {xtype : 'textfield',fieldLabel : LipiUtil.t('密码'),inputType: 'password',name:'password',listeners:{specialkey:specialkeyHandler}},
            {xtype : 'combobox',fieldLabel : LipiUtil.t('服务器'),name:"country",width:180,valueField:"value",
                store:typeComboboxStore,value:cashServer, editable:false
            },
            {xtype : 'combobox',fieldLabel : LipiUtil.t('语言'),name:"language",width:180,valueField:"value",
                store:languageComboboxStore,value:language, editable:false
            }
        ],
        buttons: [
            {xtype : 'button',text: LipiUtil.t('登 录'),handler: loginButtonClick},
            {xtype : 'button',text: LipiUtil.t('重 置'),handler: resetButtonClick}
        ]
    });
    //窗体
    var win = new Ext.Window({
        title: LipiUtil.t('用户登陆'),
        plain: false,
        width: 276,
        height: 213,
        resizable: false,
        shadow: true,
        modal: true,
        closable: false,
        animCollapse: true,
        items: form
    });
    win.show();
    return win;
}
