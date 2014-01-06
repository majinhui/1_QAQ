/*  普通环境下调用：
    var dialog = new QAQ.Dialog({
        id          : '',//选填dialog的id
        cls         : '.x1 .x2',dialog的类
        backdrop    : false,//默认点击dialog背景时 不关闭dialog
        keyboard    : true,//默认 按键盘escape 关闭dialog
        title       : "对话框标题",
        close       : true,//暂时无用

        content     : '',//dialog的模板 3种模式  1. content:'<p>我是dialog的内容</p>' 2.contentUrl:'/views/dialog模板.html' 3.contentSelector:'#模板id'
        
        width       : 420,//选填
        zIndex      : 999,//暂时无用
        position    : 'center',//暂时无用
        modal       : true, //是否显示遮罩
        renderTo    : 'body',//暂时无用
        destroy     : true,//暂时无用
        header      : true,//暂时无用
        drag        : false,//是否可拖拽
        winResize   : false//浏览器缩放时是否重新定位
    });
    //关闭
    dialog.close();

    注 若模板是angularjs：
    var dialog = new QAQ.AADialog({
        compile:$compile//必填
        scope:$scope//必填
    });

    //通用dialog
    QAQ.MMDialg.alert('警告框')
    QAQ.MMDialg.confirm('确认框',function(){//回调函数})
    QAQ.MMDialg.info('消息框','消息类型')  消息类型: 1 success 2 error 3 warning 4 message


 */

(function(){
    
    var MCache = (function() {
        var a = {};
            return {
                set: function(b, c) {
                    a[b] = c
                },
                get: function(b) {
                    return a[b]
                },
                clear: function() {
                    a = {}
                },
                remove: function(b) {
                    delete a[b]
                }
            }
    } ());
    //类继承
    function extendClass(subClass, superClass){
        var F = function(){};

        F.prototype = superClass.prototype;　　
        subClass.prototype = new F();　　
     
        subClass.superclass = superClass.prototype;
      
    }
    function substitute (str, obj) {
        if (!(Object.prototype.toString.call(str) === '[object String]')) {
            return '';
        }
      
        if(!(Object.prototype.toString.call(obj) === '[object Object]' && 'isPrototypeOf' in obj)) {
            return str;
        }
        //    /\{([^{}]+)\}/g
        return str.replace(/\{(.*?)\}/igm , function(match, key) {
            if(typeof obj[key] != 'undefined'){
                return obj[key];
            }
            return '';
        });
    }
    function BindAsEventListener (object, fun) {
        return function(event) {
            return fun.call(object, (event || window.event));
        }
    }

    function addEventHandler(oTarget, sEventType, fnHandler) {
        if (oTarget.addEventListener) {
            oTarget.addEventListener(sEventType, fnHandler, false);
        } else if (oTarget.attachEvent) {
            oTarget.attachEvent("on" + sEventType, fnHandler);
        } else {
            oTarget["on" + sEventType] = fnHandler;
        }
    };

    function removeEventHandler(oTarget, sEventType, fnHandler) {
        if (oTarget.removeEventListener) {
            oTarget.removeEventListener(sEventType, fnHandler, false);
        } else if (oTarget.detachEvent) {
            oTarget.detachEvent("on" + sEventType, fnHandler);
        } else { 
            oTarget["on" + sEventType] = null;
        }
    };

    function getWindowHeight(){
        var ret = document.documentElement.clientHeight;
        return ret;
    }
    function getWindowWidth(){
        var ret = document.documentElement.clientWidth;
        return ret;
    }
    var Bind = function(object, fun) {
        return function() {
            return fun.apply(object, arguments);
        }
    }
    //拖放程序
    var SimpleDrag = function(){
        this.initialize.apply(this, arguments);
    };
    SimpleDrag.prototype = {
      //拖放对象,触发对象
      initialize: function(options) {
        var options = options || {};
        var drag = options.drag,target = options.target;
        this.Drag = $(target)[0];
        this._x = this._y = 0;
        this._fM = BindAsEventListener(this, this.Move);
        this._fS = Bind(this, this.Stop);
        this.Drag.style.position = "absolute";
        addEventHandler($(drag)[0], "mousedown", BindAsEventListener(this, this.Start));
      },
      //准备拖动
      Start: function(oEvent) {
        this._x = oEvent.clientX - this.Drag.offsetLeft;
        this._y = oEvent.clientY - this.Drag.offsetTop;
        addEventHandler(document, "mousemove", this._fM);
        addEventHandler(document, "mouseup", this._fS);
      },
      //拖动
      Move: function(oEvent) {
        this.Drag.style.left = oEvent.clientX - this._x + "px";
        this.Drag.style.top = oEvent.clientY - this._y + "px";
      },
      //停止拖动
      Stop: function() {
        removeEventHandler(document, "mousemove", this._fM);
        removeEventHandler(document, "mouseup", this._fS);
      }
    };
    var dialogTpl = '<div class="sb_dialog_layer {_class_}" tabindex="-1" data-role="dialog"  id="{_id_}" >'+
                        '<div  class="sb_dialog_layer_main" data-role="main">'+
                            '<div class="sb_dialog_layer_title" data-role="header">'+
                                '<h3 data-role="title">{_title_}</h3>'+
                                '<a data-role="close" href="javascript:;" title="关闭" class="sb_dialog_btn_close"><span class="none">╳</span></a>'+
                            '</div>'+
                            '<div class="sb_dialog_layer_cont" data-role="content">{_content_}</div>'+
                            '<div class="sb_tip_button" data-role="footer">{_footer_}</div>'+
                        '</div>'+
                    '</div>';
    var Dialog = function(options){
        var modalTpl = '<div class="sb_dialog_modal" data-role="modal"><a data-role="backdrop" href="javascript:;" class="sb_dialog_modal_link"></a></div>';
        
        this.tpl = dialogTpl;
        this.dialogTpl = dialogTpl;
        this.modalTpl = modalTpl;
        this.setOptions(options);
        this.init();

    };

    Dialog.prototype = {
        showLoading:function(){
            var $element = this.$element;
            $($element).find('[data-role="content"]').html('<div style="padding:15px;text-align:center;">正在努力加载...</div>');
        },
        loadContentTpl:function(){
            var content = this.opts.content,contentUrl = this.opts.contentUrl,contentSelector = this.opts.contentSelector;
            var deferred = $.Deferred(),tpl;
            var $element = this.$element;
            
            if(typeof content!='undefined' && content!=''){
                setTimeout(function(){
                    deferred.resolve(content);
                }, 30)
                
            }else if(typeof contentUrl!='undefined'){
                
                if( MCache.get(contentUrl) ){
                    //console.log('MCache ',MCache.get(contentUrl),typeof MCache.get(contentUrl));
                    //angular下 不延时加载 就会报 $apply has already...
                    setTimeout(function(){
                        deferred.resolve(MCache.get(contentUrl));
                    }, 30)
                    
                    
                }else{
                    this.showLoading();

                    $.ajax({
                        url: contentUrl,
                        type: 'GET',
                        dataType: 'html'
                    })
                    .done(function(result) {
                        //console.log("success",result);
                        MCache.set(contentUrl,result)
                        deferred.resolve(result);
                    })
                    .fail(function() {
                        //console.log("error");
                        deferred.reject('获取内容失败');
                    })
                    .always(function() {
                       // console.log("complete");
                    });
                }
                    


            }else if(typeof contentSelector!='undefined'){
                tpl = $(contentSelector).html();
               
                deferred.resolve(tpl);

            }else{
                deferred.reject('获取内容失败');
            }

                

            return deferred.promise();
            
        },
        //设置参数
        setOptions:function(options){
            var options = options || {},opts = {},value;
            var timeStamp = new Date().valueOf();
            var defaults = this.defaults = {
                id:'dialog_'+timeStamp,
                backdrop:true,//'static' for a backdrop which doesn't close the modal on click.
                keyboard:true,//Closes the modal when escape key is pressed
                title      : "对话框",
                close      : true,//关闭按钮
                content: '',
                width      : 420,
                zIndex     : 999,
                position   : 'center',
                modal      : true, 
                renderTo     : 'body',
                destroy:true,
                header:true,//显示头部
                winResize:false//浏览器缩放时要不要重新定位
              /*  buttons     : 
                     [
                        {
                            name  : '取消',
                            click: function(){
                                this.hide();
                            }
                        },
                        {
                            name     : '确定',
                            click: function(){
                                this.hide();
                            }
                        }
                    ]*/
                
            };

            for(var param in  defaults){
                opts[param] = defaults[param];
            }
            for(var param in  options){

                opts[param] = options[param];
            }
            if(!opts.buttons){
                opts.buttons = [];
            }
            for(var i = 0; i<opts.buttons.length; i++){
                if(typeof opts.buttons[i]['id'] === 'undefined'){
                    opts.buttons[i]['id'] = 'dialog-btn-'+timeStamp+i;
                }
            }
            
            if(opts.dialogTpl){
                this.dialogTpl = opts.dialogTpl;
            }
            this.opts = opts;
            
           
        },
        init:function(){
            this.renderUI();
            this.bindUI();
            this.syncUI();
        },
        //生成遮罩
        renderModal:function(){
            var modal = this.opts.modal;
            if(!modal){
                return;
            }
            var modalTpl = this.modalTpl;
            var height = $('body')[0].clientHeight;

            $("body")[0].insertAdjacentHTML("beforeEnd", modalTpl);
            $(".sb_dialog_modal")[0].style.height = height+'px';

            this.$modal = $('div[data-role="modal"]')[0];
        },
        bindKeyboard:function(){
            var keyboard = this.opts.keyboard;

            this._bindKeyboard = BindAsEventListener(this,function(event){
                var e = event ? event : window.event; 
                var keyCode = e.which ? e.which : e.keyCode;     //获取按键值
                if(keyCode === 27 ){
                    this.close();
                }
                //console.log(e,e.which,e.keyCode)
            });
            //console.log('keyboard',keyboard)
            if(keyboard){
                addEventHandler(document,'keydown',this._bindKeyboard);
            }
        },
        bindUI:function(){
            var self=this,opts = this.opts;

            this.bindClose();
            this.bindFooterButtons();
            this.bindWindowResize();
            this.bindKeyboard();
            this.bindDrag();
            this.bindBackdrop();
        },
        bindBackdrop:function(){
            if(false === this.opts.modal){
                return;
            }
            var self = this;
            var $modal = this.$modal;
            this._onBackDropClick = BindAsEventListener(this,function(){
                //console.log('backdrop ',this.opts.backdrop)
                if(true === this.opts.backdrop){
                    this.close();
                }
            });
            addEventHandler($($modal).find('[data-role="backdrop"]')[0],'click',this._onBackDropClick);
        },
        bindDrag:function(){
            var id = '#'+this.opts.id,drag = id +' [data-role="header"]';

            if(true === this.opts.drag){
                 this._drag = new SimpleDrag({
                    target:id,
                    drag:drag
                });
                $(drag)[0].style.cursor = 'move';
            }
               
        },
        bindFooterButtons:function(){
            var self = this,buttons = this.opts.buttons,button,$button,callback,id;

            for (var i = buttons.length - 1; i >= 0; i--) {
                button = buttons[i];
                callback = button.click;
                id = '#'+button.id;
                (function(id,callback,self){
                    
                    addEventHandler($(id)[0],'click',function(){
                        if(typeof callback === 'function'){
                            callback.call(self);
                        }
                    });
                    
                })(id,callback,self);
                    
            };
        },
        bindClose:function(){
            var self=this,opts = this.opts,id=opts.id,$element = this.$element;

            this._close = BindAsEventListener(this,this.close);
            addEventHandler( $($element).find('[data-role="close"]')[0],'click',this._close);
            
        },
        //浏览器缩放重新定位
        bindWindowResize:function(){
            if(false === this.opts.winResize){
                return;
            }
            var self = this;
            this._onWindowResize = BindAsEventListener(this,function(){
                //console.log('_onWindowResize',this,self)
                this.initPosition();
            });
            addEventHandler(window,'resize',this._onWindowResize);
        },
        getContentHtml:function(){
            var $element = this.$element;
            var self = this;
            this.loadContentTpl().done(function(content){

                self.renderContent(content);
                self.initPosition();

            }).fail(function(msg){
                self.showErrorMsg(msg);
            });
        },
        renderContent:function(content){
            var $element = this.$element;
            $($element).find('[data-role="content"]').html(content);
        },
        showErrorMsg:function(msg){
            var $element = this.$element;

            $($element).find('[data-role="content"]').html('<div style="padding:15px;text-align:center;">'+msg+'</div>');
        },
        getDialogHtml:function(){
            var opts = this.opts,
                buttons = opts.buttons,
                dialogTpl = this.dialogTpl,
                obj = {},footer='',btnFrag = [],btn,btnStr,cls,
                btnTpl = '<button id="{id}" class="sb-dialog-btn {cls}">{name}</button>';
        
            for(var i=0;i<buttons.length;i++){
                btn = buttons[i];
                cls = btn.cls;
                if(cls){
                    btn.cls = cls.replace(/\./g,'');
                }
                btnStr = substitute(btnTpl,btn);
                btnFrag.push(btnStr);
            }
            
            
            opts['cls'] = opts['cls'] || '';
            opts['cls'] = opts['cls'].replace(/\./g,'');
            obj = {
                _id_:opts.id,
                _class_:opts.cls,
                _title_:opts.title,
                _content_:'',
                _footer_:btnFrag.join(' ')
            };


            var html = substitute(dialogTpl,obj);
        

            return html;
        },
        renderDialog:function(){
            //console.log(2222222222,this.opts)
            var html = this.getDialogHtml();
            $("body")[0].insertAdjacentHTML("beforeEnd", html);

            this.$element = $('#'+this.opts.id)[0];
            this.getContentHtml();

        },
        renderUI:function(){
            var self=this,opts = this.opts;

            this.renderModal();
            this.renderDialog();
        },
        syncUI:function(){
            this.initPosition();
        },
        initPosition:function(){
            var opts = this.opts,
                width = opts.width || 400,
                height ,
                contentHeight = opts.height,
                dialogHeight = height+64,
                winHeight = window.innerHeight || document.documentElement.clientHeight,
                winWidth = window.innerWidth || document.documentElement.clientWidth,
                scrollTop,zIndex,
                top,left,
                $element = this.$element;

            if(!window._dlgBaseDepth){
                window._dlgBaseDepth = 999;
            }
            //假如底部按钮为空
            if(opts.buttons.length === 0){
                $($element).find('[data-role="footer"]')[0].style.display = 'none';
            }
            zIndex = window._dlgBaseDepth++;
            left =  Math.floor( (winWidth-width)*0.5 );

            console.log(1111111111,$element.clientHeight)
            $element.style.display = 'block';
            
            if(contentHeight){
                $($element).find('[data-role="content"]')[0].style.height = contentHeight + 'px';
            }
            
            //谷歌下不能立即获取scrollTop
            setTimeout(function(){
                $element.style.width = width+'px';
                $element.style.left = left+'px';
                $element.style.zIndex = zIndex;
                height =  $element.offsetHeight;
                scrollTop = Math.max(document.documentElement.scrollTop,document.body.scrollTop)
                //top = Math.floor( (winHeight-height)*0.45+scrollTop );//position:absolute
                top = Math.floor( (winHeight-height)*0.45 );//position:fixed
                $element.style.top = top+'px';
                /*console.log(' scrollTop ',scrollTop,' top ',top);
                console.log('winHeight',winHeight,'height',height,'opts.height',opts.height)
                console.log('top ',top)*/
                
            },100);
            
        },
        hide:function(){
            this.$element.style.display = 'none';
            this.$modal && this.$modal.parentNode.removeChild(this.$modal);
        },
        show:function(){
            var id = this.opts.id;

            $('#'+id)[0].style.display = 'block';
            this.renderModal();
            this.initPosition();
        },
        
        close:function(){
            this.removeEventListeners();
            this.$element.parentNode.removeChild(this.$element);
            this.$modal && this.$modal.parentNode.removeChild(this.$modal); 
            
        },
        destroy:function(){

        },
        removeEventListeners:function(){
            var self = this;
            removeEventHandler(document,'keydown',this._bindKeyboard);
            removeEventHandler(window,'resize',this._onWindowResize);
        }
    };

    window['Dialog'] = Dialog;


    //angularjs下的dialog
    var AADialog = function(options){
        var options = options || {};
        var cls = options.cls || '';
        var scope = options.scope;
        var compile = options.compile;
        if(!scope){
            alert('缺少参数 scope ');
            return;
        }
        if(!compile){
            alert('缺少参数 compile ');
            return;
        }
       
        Dialog.call(this,options); 
       

    };
    extendClass(AADialog,Dialog);

    AADialog.prototype.renderContent=function(content){
        var $compile = this.opts.compile;
        var $scope = this.opts['scope'];
        var $element = this.$element;
        var link = $compile(content);
        var node = link($scope);
      
        $($element).find('[data-role="content"]').html(node);
        $scope.$apply();
    };
    window['AADialog'] = AADialog;

    //
    //
    //
    // 通用对框框
    var MMDialog = {
        alert:function(msg){
            var msg = msg || '';
            var content = '<div class="sb-alert-box">'+msg+'</div>';
            var options = {
                title:'警告框',
                content:content,
                buttons:[
                    {
                        name  : '确定',
                        cls:'.bt_tip_hit',
                        click: function(){
                            this.hide();
                        }
                    }
                ]
            };

            new Dialog(options);
        },
        confirm:function(msg,callback){
            var ret = false;
            var msg = msg || '';
            var content = '<div class="sb-alert-box">'+msg+'</div>';
            var options = {
                title:'确认框',
                content:content,
                buttons:[
                    {
                        name  : '确定',
                        cls:'.bt_tip_hit',
                        click: function(){
                            this.hide();
                            callback && callback();
                        }
                    },
                    {
                        name  : '取消',
                        cls:'.bt_tip_normal',
                        click: function(){
                            this.hide();
                        }
                    }
                ]
            };

            new Dialog(options);
            
        },
        info:function(msg,msgtype){
            var msg = msg || '';
            var msgtype = msgtype || '';
            var msgclass = '';
            var content;
            switch(msgtype){
                case 'warning':
                    msgclass = 'sb-icon-warning';
                    break;
                case 'error':
                    msgclass = 'sb-icon-error';
                    break;
                case 'success':
                    msgclass = 'sb-icon-success';
                    break;
                case 'message':
                    msgclass = 'sb-icon-message';
                    break;
                default:
                    msgclass = 'sb-icon-message';
                    break;
            };

            content = '<div class="sb-info-box"><span class="sb-dialog-icon '+ msgclass +'"></span><span class="sb-info-txt">'+msg+'</span></div>';

            var options = {
                title:'提示框',
                content:content,
                buttons:[
                    {
                        name  : '确定',
                        cls:'.bt_tip_hit',
                        click: function(){
                            this.hide();
                        }
                    }
                ]
            };

            new Dialog(options);
        }

    };
    function centerElement($element,width,height){
        var winHeight = window.innerHeight || document.documentElement.clientHeight,
            winWidth = window.innerWidth || document.documentElement.clientWidth,
            scrollTop,
            top,left;
            
            left =  Math.floor( (winWidth-width)*0.5 );

            $element.style.display = 'block';
            $element.style.width = width+'px';
            $element.style.left = left+'px';
            
            //谷歌下不能立即获取scrollTop
            setTimeout(function(){
                height =  height || $element.offsetHeight;
                scrollTop = Math.max(document.documentElement.scrollTop,document.body.scrollTop)
                top = Math.floor( (winHeight-height)*0.45 );
                $element.style.top = top+'px';
              
                
            },30);
    }
    // 146 * 146
    var Loading = {

        show:function(msg){
            var msg = msg || '';
            var loadingTpl = '<div id="sb-loading-box"><div class="sb-loading-cont"><span class="sb-loading-txt">{msg}</span></div></div>';

            $('#sb-loading-box').remove();
            var frag = substitute(loadingTpl,{msg:msg});
            $('body').append(frag);

            centerElement($('#sb-loading-box')[0],146,146);
        },
        hide:function(){
            $('#sb-loading-box').remove();
        }
    };


    function QAQ(){

    }

    QAQ.extendClass = extendClass;
    QAQ.Dialog = Dialog;
    QAQ.AADialog = AADialog;
    QAQ.MMDialog = MMDialog;
    QAQ.Loading = Loading;


    window['QAQ'] = QAQ;
   
})();