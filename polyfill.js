function ObjectClone(obj) {
  var copy = (obj instanceof Array) ? [] : {};
  for (var attr in obj) {
    if (!obj.hasOwnProperty(attr)) continue;
    copy[attr] = (typeof obj[attr] == "object")?ObjectClone(obj[attr]):obj[attr];
  }
  return copy;
}

function XmlHttpPostJson(url,obj,fun){
  var xmlhttp=new XMLHttpRequest();
  var handler=function(){
    fun(xmlhttp);
  }
  xmlhttp.onreadystatechange=handler;
  xmlhttp.open("POST",url,true);
  xmlhttp.send(JSON.stringify(obj));
}

function XmlHttpGetArrBuf(url,fun){
  var xmlhttp=new XMLHttpRequest();
  var handler=function(){
    fun(xmlhttp);
  }
  var retrycount=0;
  xmlhttp.onreadystatechange=handler;
  xmlhttp.ontimeout=function(){
    setTimeout(function(){
    console.log("xmlhttp get timeout! retrying in "+retrucount+"s");
      xmlhttp.send();
    },retrycount*1000);
    retrycount++;
  }
  xmlhttp.responseType="arraybuffer";
  xmlhttp.open("GET",url,true);
  xmlhttp.send();
}

function $$(id){
  return document.getElementById(id);
}

function $setText(elm,s){
  if(typeof elm.innerText==="string"){
    elm.innerText=s;
  }else{
    elm.textContent=s;
  }
}

function range(start, end, inc) {
  inc = inc || 1;
  var array = [];
  for (var i = start; i < end; i += inc) {
    array.push(i);
  }
  return array;
}
/**
 * Add divisor method so we can do clock arithmetics. This is later used to
 *  determine tetromino orientation.
 */
Number.prototype.mod = function(n) {
  return ((this % n) + n) % n;
};
