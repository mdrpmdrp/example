function flex2html(e,t){let r=carousel_struc(),x="";return"flex"===t.type&&("bubble"===(t=t.contents).type?(x=bubble_object(t),r=r.replace("\x3c!-- inner --\x3e",x)):"carousel"===t.type&&t.contents.forEach(((e,t)=>{let x=bubble_object(e);x=x.replace("\x3c!-- content --\x3e",""),x=x.replace("\x3c!-- inner --\x3e",""),r=r.replace("\x3c!-- inner --\x3e",x+"\x3c!-- inner --\x3e")}))),document.getElementById(e).innerHTML+=r,r}function bubble_object(e){let{hero:t,header:r,body:x,footer:i}=e,a=hero_struc(e),l=header_struc(e),n=body_struc(e),o=footer_struc(e),d=bubble_struc(e),c="";for(let e in t)if(t.hasOwnProperty(e))if("type"===e&&"box"===t[e]){c=box_object(t),c=box_recursive(c,t.contents)}else c=convert_object(t);a=a.replace("\x3c!-- inner --\x3e",c),c="";for(let e in r)if(r.hasOwnProperty(e)&&"type"===e&&"box"===r[e]){c=box_object(r),c=box_recursive(c,r.contents)}l=l.replace("\x3c!-- inner --\x3e",c),c="";for(let e in x)if(x.hasOwnProperty(e)&&"type"===e&&"box"===x[e]){c=box_object(x),c=box_recursive(c,x.contents)}n=n.replace("\x3c!-- inner --\x3e",c),c="";for(let e in i)if(i.hasOwnProperty(e)&&"type"===e&&"box"===i[e]){c=box_object(i),c=box_recursive(c,i.contents)}return o=o.replace("\x3c!-- inner --\x3e",c),d=d.replace("\x3c!-- hero --\x3e",a),d=d.replace("\x3c!-- header --\x3e",l),d=d.replace("\x3c!-- body --\x3e",n),d=d.replace("\x3c!-- footer --\x3e",o),d}function box_recursive(e,t){let r=[];return t.forEach(((e,t)=>{let x;if("box"===e.type){x=box_recursive(box_object(e),e.contents)}else if("text"===e.type&&e.contents&&e.contents.length>0){x=box_recursive(convert_object(e),e.contents)}else x=convert_object(e);r[t]=x})),t.forEach(((t,x)=>{r[x]=r[x].replace("\x3c!-- content --\x3e",""),e=e.replace("\x3c!-- content --\x3e",r[x]+"\x3c!-- content --\x3e")})),e}function convert_object(e){switch(e.type){case"image":object=image_object(e);break;case"icon":object=icon_object(e);break;case"text":object=text_object(e);break;case"span":object=span_object(e);break;case"button":object=button_object(e);break;case"filler":object=filler_object(e);break;case"spacer":object=spacer_object(e);break;case"separator":object=separator_object(e);break;default:object=null}return object}function box_object(e){let t="",{layout:r,position:x,flex:i,spacing:a,margin:l,width:n,height:o,backgroundColor:d,borderColor:c,borderWidth:s,cornerRadius:p,justifyContent:$,alignItems:f,offsetTop:b,offsetBottom:g,offsetStart:u,offsetEnd:E,paddingAll:y,paddingTop:m,paddingBottom:v,paddingStart:h,paddingEnd:k,background:B,maxWidth:j,maxHeight:_}=e;if("baseline"===r?(layout1="hr",layout2="bl"):"horizontal"===r?(layout1="hr",layout2=""):"vertical"===r&&(layout1="vr",layout2=""),fl="",i>3?t+=`-webkit-box-flex:${i};flex-grow:${i};`:fl=i>=0?`fl${i}`:"",exabs="absolute"===x?"ExAbs":"",a&&a.indexOf("px")>=0?spc="":spc=a?"spc"+upperalldigit(a):"",l&&l.indexOf("px")>=0?(t+=`margin-top:${l};`,exmgn=""):exmgn=l?"ExMgnT"+upperalldigit(l):"",n&&""!==n&&(t+=`width:${n}; max-width:${n};`),o&&""!==o&&(t+=`height:${o};`),d&&(t+=`background-color:${d} !important;`),c&&(t+=`border-color:${c} !important;`),s&&s.indexOf("px")>=0)t+=`border-width:${s};`,ExBdr="";else switch(s){case"none":ExBdr="ExBdrWdtNone";break;case"light":ExBdr="ExBdrWdtLgh";break;case"normal":ExBdr="ExBdrWdtNml";break;case"medium":ExBdr="ExBdrWdtMdm";break;case"semi-bold":ExBdr="ExBdrWdtSbd";break;case"bold":ExBdr="ExBdrWdtBld";break;default:ExBdr=""}if(p&&p.indexOf("px")>=0?(t+=`border-radius:${p};`,ExBdrRad=""):ExBdrRad=p?"ExBdrRad"+upperalldigit(p):"",jfc="",$&&""!==$)switch($){case"center":jfc="itms-jfcC";break;case"flex-start":jfc="itms-jfcS";break;case"flex-end":jfc="itms-jfcE";break;case"space-between":jfc="itms-jfcSB";break;case"space-around":jfc="itms-jfcSA";break;case"space-evenly":jfc="itms-jfcSE";break;default:jfc=""}if(alg="",f&&""!==f)switch(f){case"center":alg="itms-algC";break;case"flex-start":alg="itms-algS";break;case"flex-end":alg="itms-algE";break;default:alg=""}return b&&b.indexOf("px")>=0?(t+=`top:${b};`,ext=""):ext=b?"ExT"+upperalldigit(b):"",g&&g.indexOf("px")>=0?(t+=`bottom:${g};`,exb=""):exb=g?"ExB"+upperalldigit(g):"",u&&u.indexOf("px")>=0?(t+=`left:${u};`,exl=""):exl=u?"ExL"+upperalldigit(u):"",E&&E.indexOf("px")>=0?(t+=`right:${E};`,exr=""):exr=E?"ExR"+upperalldigit(E):"",y&&y.indexOf("px")>=0?(t+=`padding:${y};`,ExPadA=""):ExPadA=y?"ExPadA"+upperalldigit(y):"",m&&m.indexOf("px")>=0?(t+=`padding-top:${m};`,ExPadT=""):ExPadT=m?"ExPadT"+upperalldigit(m):"",v&&v.indexOf("px")>=0?(t+=`padding-bottom:${v};`,ExPadB=""):ExPadB=v?"ExPadB"+upperalldigit(v):"",h&&h.indexOf("px")>=0?(t+=`padding-left:${h};`,ExPadL=""):ExPadL=h?"ExPadL"+upperalldigit(h):"",k&&k.indexOf("px")>=0?(t+=`padding-right:${k};`,ExPadR=""):ExPadR=k?"ExPadR"+upperalldigit(k):"",B&&"linearGradient"===B.type&&(centerPosition=B.centerPosition?B.centerPosition:"50%",B.centerColor?t+=`background: linear-gradient(${B.angle}, ${B.startColor} 0%, ${B.centerColor} ${centerPosition}, ${B.endColor} 100%);`:t+=`background: linear-gradient(${B.angle}, ${B.startColor} 0%, ${B.endColor} 100%);`),j&&j.indexOf("px")>=0&&(t+=`max-width:${j};`),_&&_.indexOf("px")>=0&&(t+=`max-height:${_};`),`<div class="MdBx ${layout1} ${layout2} ${fl} ${exabs} ${exmgn} ${spc} ${ExBdr} ${ExBdrRad} ${jfc} ${alg} ${ext} ${exb} ${exl} ${exr} ${ExPadA} ${ExPadT} ${ExPadB} ${ExPadL} ${ExPadR}" style="${t}">\x3c!-- content --\x3e</div>`}function button_object(e){style2="",style3="";let{flex:t,margin:r,position:x,height:i,style:a,color:l,gravity:n,adjustMode:o,offsetTop:d,offsetBottom:c,offsetStart:s,offsetEnd:p,action:$}=e;if(fl="",t>3?style2+=`-webkit-box-flex:${t};flex-grow:${t};`:fl=t>=0?`fl${t}`:"",exabs="absolute"===x?"ExAbs":"",r&&r.indexOf("px")>=0?(style2+=`margin-top:${r};`,exmgn=""):exmgn=r?"ExMgnT"+upperalldigit(r):"",i=i&&""!==i&&"md"!==i?"Ex"+upperalldigit(i):"",grv="bottom"===n||"center"===n?"grv"+upper1digit(n):"",ExBtn="ExBtnL",a&&""!==a)switch(a){case"link":default:ExBtn="ExBtnL";break;case"primary":ExBtn="ExBtn1";break;case"secondary":ExBtn="ExBtn2"}return l&&(style3+=`background-color:${l} !important;`),d&&d.indexOf("px")>=0?(style2+=`top:${d};`,ext=""):ext=d?"ExT"+upperalldigit(d):"",c&&c.indexOf("px")>=0?(style2+=`bottom:${c};`,exb=""):exb=c?"ExB"+upperalldigit(c):"",s&&s.indexOf("px")>=0?(style2+=`left:${s};`,exl=""):exl=s?"ExL"+upperalldigit(s):"",p&&p.indexOf("px")>=0?(style2+=`right:${p};`,exr=""):exr=p?"ExR"+upperalldigit(p):"",$=$||{type:"none"},"uri"===$.type?`<div class="MdBtn ${ExBtn} ${i} ${fl} ${exabs} ${exmgn} ${grv} ${ext} ${exb} ${exl} ${exr}" style="${style2}" id="8d1efea2-4017-4c89-8931-98a5f4f141f2"><a href="${$.uri}" target="_blank" style="${style3}"><div>${$.label}</div></a></div>`:"message"===$.type?`<div class="MdBtn ${ExBtn} ${i} ${fl} ${exabs} ${exmgn} ${grv} ${ext} ${exb} ${exl} ${exr}" style="${style2}" id="8d1efea2-4017-4c89-8931-98a5f4f141f2"><a onclick="alert('message: ${$.text}')" style="${style3}"><div>${$.label}</div></a></div>`:"postback"===$.type?`<div class="MdBtn ${ExBtn} ${i} ${fl} ${exabs} ${exmgn} ${grv} ${ext} ${exb} ${exl} ${exr}" style="${style2}" id="8d1efea2-4017-4c89-8931-98a5f4f141f2"><a onclick="alert('postback data: ${$.data}')" style="${style3}"><div>${$.label}</div></a></div>`:`<div class="MdBtn ${ExBtn} ${i} ${fl} ${exabs} ${exmgn} ${grv} ${ext} ${exb} ${exl} ${exr}" style="${style2}" id="8d1efea2-4017-4c89-8931-98a5f4f141f2"><a style="${style3}"><div>${$.label}</div></a></div>`}function filler_object(e){let t="",{flex:r}=e;return fl="",r>3?t+=`-webkit-box-flex:${r};flex-grow:${r};`:fl=r>=0?`fl${r}`:"",`<div class="mdBxFiller ${fl}" style="${t}" ></div>`}function icon_object(e){let t="",{size:r,aspectRatio:x,url:i,position:a,margin:l,offsetTop:n,offsetBottom:o,offsetStart:d,offsetEnd:c}=e,s=`background-image:url('${i}');`;return r=r&&""!==r?r:"md",r.indexOf("px")>=0?(t+=`font-size:${r};`,r=""):r="Ex"+upperalldigit(r),x&&""!==x?(ratio=ratio[0]/ratio[1],s+=`width:${ratio}em;`):s+="width:1em;",exabs="absolute"===a?"ExAbs":"",l&&l.indexOf("px")>=0?(t+=`margin-top:${l};`,exmgn=""):exmgn=l?"ExMgnT"+upperalldigit(l):"",n&&n.indexOf("px")>=0?(t+=`top:${n};`,ext=""):ext=n?"ExT"+upperalldigit(n):"",o&&o.indexOf("px")>=0?(t+=`bottom:${o};`,exb=""):exb=o?"ExB"+upperalldigit(o):"",d&&d.indexOf("px")>=0?(t+=`left:${d};`,exl=""):exl=d?"ExL"+upperalldigit(d):"",c&&c.indexOf("px")>=0?(t+=`right:${c};`,exr=""):exr=c?"ExR"+upperalldigit(c):"",`<div class="MdIco fl0 ${r} ${exabs} ${exmgn} ${ext} ${exb} ${exl} ${exr}" style="${t}" ><div><span style="${s}"></span></div></div>`}function image_object(e){let t="",r="",{aspectMode:x,size:i,aspectRatio:a,url:l,position:n,flex:o,margin:d,align:c,gravity:s,backgroundColor:p,offsetTop:$,offsetBottom:f,offsetStart:b,offsetEnd:g,action:u}=e,E=`background-image:url('${l}');`;return p&&(E+=`background-color:${p} !important;`),x=x&&""!==x?x:"fit",i=i&&""!==i?i:"md",x=upperalldigit(x),i.indexOf("px")>=0?(r+=`width:${i};`,i=""):i="Ex"+upperalldigit(i),a&&""!==a?(ratio=a.split(":"),ratio=100*ratio[1]/ratio[0]):ratio="100",fl="",o>3?t+=`-webkit-box-flex:${o};flex-grow:${o};`:fl=o>=0?`fl${o}`:"",exabs="absolute"===n?"ExAbs":"",d&&d.indexOf("px")>=0?(t+=`margin-top:${d};`,exmgn=""):exmgn=d?"ExMgnT"+upperalldigit(d):"",alg="start"===c||"end"===c?"alg"+upper1digit(c):"",grv="bottom"===s||"center"===s?"grv"+upper1digit(s):"",$&&$.indexOf("px")>=0?(t+=`top:${$};`,ext=""):ext=$?"ExT"+upperalldigit($):"",f&&f.indexOf("px")>=0?(t+=`bottom:${f};`,exb=""):exb=f?"ExB"+upperalldigit(f):"",b&&b.indexOf("px")>=0?(t+=`left:${b};`,exl=""):exl=b?"ExL"+upperalldigit(b):"",g&&g.indexOf("px")>=0?(t+=`right:${g};`,exr=""):exr=g?"ExR"+upperalldigit(g):"",u=u||{type:"none"},"uri"===u.type?`<div class="MdImg Ex${x} ${fl} ${i} ${exabs} ${exmgn} ${alg} ${grv} ${ext} ${exb} ${exl} ${exr}"  style="${t}">\n                  <div style="${r}">\n                     <a href="${u.uri}" target="_blank" style="padding-bottom:${ratio}%;">\n                        <span style="${E}"></span>\n                     </a>\n                  </div>\n               </div>`:"message"===u.type?`<div class="MdImg Ex${x} ${fl} ${i} ${exabs} ${exmgn} ${alg} ${grv} ${ext} ${exb} ${exl} ${exr}"  style="${t}">\n                  <div style="${r}">\n                     <a onclick="alert('message: ${u.text}')" style="padding-bottom:${ratio}%;">\n                        <span style="${E}"></span>\n                     </a>\n                  </div>\n               </div>`:"postback"===u.type?`<div class="MdImg Ex${x} ${fl} ${i} ${exabs} ${exmgn} ${alg} ${grv} ${ext} ${exb} ${exl} ${exr}"  style="${t}">\n                  <div style="${r}">\n                     <a onclick="alert('postback data: ${u.data}')" style="padding-bottom:${ratio}%;">\n                        <span style="${E}"></span>\n                     </a>\n                  </div>\n               </div>`:`<div class="MdImg Ex${x} ${fl} ${i} ${exabs} ${exmgn} ${alg} ${grv} ${ext} ${exb} ${exl} ${exr}"  style="${t}">\n                  <div style="${r}">\n                     <a style="padding-bottom:${ratio}%;">\n                        <span style="${E}"></span>\n                     </a>\n                  </div>\n               </div>`}function separator_object(e){let t="",{margin:r,color:x}=e;return r&&r.indexOf("px")>=0?(t+=`margin-top:${r};`,exmgn=""):exmgn=r?"ExMgnT"+upperalldigit(r):"",x&&(t+=`border-color:${x} !important;`),`<div class="fl0 MdSep ${exmgn}" style="${t}" ></div>`}function spacer_object(e){let{size:t}=e;return t=t&&""!==t?t:"md",t=t.indexOf("px")>=0?"":"spc"+upperalldigit(t),`<div class="mdBxSpacer ${t} fl0" ></div>`}function span_object(e){let t="",{text:r,size:x,color:i,weight:a,style:l,decoration:n}=e;return x&&""!==x?x.indexOf("px")>=0?(t+=`font-size:${x};`,x=""):x="Ex"+upperalldigit(x):x="",i&&""!==i&&(t+=`color:${i};`),ExWB="bold"===a?"ExWB":"",ExFntSty="normal"===l?"ExFntStyNml":"italic"===l?"ExFntStyIt":"",ExTxtDec="line-through"===n?"ExTxtDecLt":"underline"===n?"ExTxtDecUl":"none"===n?"ExTxtDecNone":"",`<span class="MdSpn ${ExWB} ${x} ${ExFntSty} ${ExTxtDec}" style="${t}" >${r}</span>`}function carousel_struc(){return'<div class="LySlider"><div class="lyInner">\x3c!-- inner --\x3e</div></div><br>'}function bubble_struc(e){let{size:t,direction:r,action:x}=e;return t=t&&""!==t?t:"medium",r=r&&""!=r?r:"ltr",t=upper2digit(t),`<div class="lyItem Ly${t}"><div class="T1 fx${r.toUpperCase()}" dir="${r}">\x3c!-- hero --\x3e\x3c!-- header --\x3e\x3c!-- body --\x3e\x3c!-- footer --\x3e</div></div>`}function hero_struc(e){let{styles:t}=e,r="";if(t){let{hero:e}=t;r=e&&e.backgroundColor?`background-color:${e.backgroundColor}`:""}return`<div class="t1Hero" style="${r}">\x3c!-- inner --\x3e</div>`}function header_struc(e){let{styles:t}=e,r="";if(t){let{header:e}=t;r=e&&e.backgroundColor?`background-color:${e.backgroundColor}`:""}return`<div class="t1Header" style="${r}">\x3c!-- inner --\x3e</div>`}function body_struc(e){let{footer:t,styles:r}=e,x="";if(r){let{body:e}=r;x=e&&e.backgroundColor?`background-color:${e.backgroundColor}`:""}return`<div class="t1Body ${t?"ExHasFooter":""}" style="${x}">\x3c!-- inner --\x3e</div>`}function footer_struc(e){let{styles:t}=e,r="";if(t){let{footer:e}=t;r=e&&e.backgroundColor?`background-color:${e.backgroundColor}`:""}return`<div class="t1Footer" style="${r}">\x3c!-- inner --\x3e</div>`}function text_object(e){let t="",{flex:r,margin:x,size:i,position:a,align:l,gravity:n,text:o,color:d,weight:c,style:s,decoration:p,wrap:$,maxLines:f,adjustMode:b,offsetTop:g,offsetBottom:u,offsetStart:E,offsetEnd:y,lineSpacing:m}=e;if(fl="",r>3?t+=`-webkit-box-flex:${r};flex-grow:${r};`:fl=r>=0?`fl${r}`:"",exabs="absolute"===a?"ExAbs":"",x&&x.indexOf("px")>=0?(t+=`margin-top:${x};`,exmgn=""):exmgn=x?"ExMgnL"+upperalldigit(x):"",alg="start"===l||"end"===l||"center"===l?"ExAlg"+upper1digit(l):"",grv="bottom"===n||"center"===n?"grv"+upper1digit(n):"",i=i&&""!==i?i:"md",i.indexOf("px")>=0?(t+=`font-size:${i};`,i=""):i="Ex"+upperalldigit(i),d&&""!==d&&(t+=`color:${d};`),ExWB="bold"===c?"ExWB":"",ExFntSty="normal"===s?"ExFntStyNml":"italic"===s?"ExFntStyIt":"",ExTxtDec="line-through"===p?"ExTxtDecLt":"underline"===p?"ExTxtDecUl":"none"===p?"ExTxtDecNone":"",ExWrap=!0===$?"ExWrap":"",g&&g.indexOf("px")>=0?(t+=`top:${g};`,ext=""):ext=g?"ExT"+upperalldigit(g):"",u&&u.indexOf("px")>=0?(t+=`bottom:${u};`,exb=""):exb=u?"ExB"+upperalldigit(u):"",E&&E.indexOf("px")>=0?(t+=`left:${E};`,exl=""):exl=E?"ExL"+upperalldigit(E):"",y&&y.indexOf("px")>=0?(t+=`right:${y};`,exr=""):exr=y?"ExR"+upperalldigit(y):"",m&&m.indexOf("px")>=0){t+=`line-height:${parseInt(m.replace("px",""))+15+"px"};`}return o=o||"",`<div class="MdTxt ${fl} ${exabs} ${exmgn} ${alg} ${grv} ${i} ${ExWB} ${ExFntSty} ${ExTxtDec} ${ExWrap} ${ext} ${exb} ${exl} ${exr}" style="${t}"><p>${o}\x3c!-- content --\x3e</p></div>`}function upper1digit(e){return e.charAt(0).toUpperCase()}function upper2digit(e){return e.charAt(0).toUpperCase()+e.substring(1,2)}function upperalldigit(e){return e.charAt(0).toUpperCase()+e.slice(1)}