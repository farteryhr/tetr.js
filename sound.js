function Sound() {
  var sebankArr=[void 0,"meme","drocelot"];
  
  var itworks=false;
  var webaudio=false;
  var lowMode=false; // for audio tag only
  
  var ctx=null;
  
  function resumeAC(resolved,rejected){
    if(ctx.resume){
      ctx.resume().then(resolved).catch(rejected);
    }else{ // old browsers no need to resume
      if(resolved){
        resolved();
      }
    }
  }
  
  var sebankwavelist={
    meme:"bravo,endingstart,erase1,erase2,erase3,erase4,gameover,garbage,lock,tspin0,tspin1,tspin2,tspin3".split(","),
    drocelot:"bravo,endingstart,erase1,erase2,erase3,erase4,gameover,garbage,lock,move,rotate,hold,ready,go,harddrop,tspin0,tspin1,tspin2,tspin3".split(","),
  }
  var repcount = {
    "move": 3,
    "erase1": 4,
    "erase2": 3,
    "erase3": 3,
    "erase4": 3,
    "harddrop": 3,
    "lock": 3,
    "hold": 3,
  }
  var waves={};
  var sebank={};
  var loadwavebank= function(dest,bankname,wavenames){
    console.assert(wavenames !== void 0);
    for(var i=0;i<wavenames.length;i++){
      var iname = wavenames[i];
      var count = (webaudio||lowMode) ? 1 :(repcount[iname] || 2);
      dest[iname] = {
        insts: [],
        curidx: 0,
      };
      for(var j=0;j<count;j++){
        var url="se/"+bankname+"/"+iname+".mp3";
        if(webaudio){
          (function(iname){ // closure pitfall
            XmlHttpGetArrBuf(url,function(xmlhttp){
              if (xmlhttp.readyState==4){// 4 = "loaded"
                if (xmlhttp.status==200){
                  ctx.decodeAudioData(xmlhttp.response,function(audioBuf){
                    dest[iname].insts.push(audioBuf);
                    // console.log("audio decode success "+iname);
                  },function(e){
                    console.log("audio decode error "+e.message);
                  })
                }
              }
            });
          })(iname);
        }else{
          var wave = document.createElement("AUDIO");
          wave.src=url;
          wave.load();
          dest[iname].insts.push(wave);
        }
      }
    }
  }
  this.init=function(){
    if(itworks===false){
      if(typeof ArrayBuffer==="function"
        && typeof AudioContext==="function"
        && typeof AudioBufferSourceNode==="function"
        && window.location.protocol!=="file:"){
        var AC=window.AudioContext||window.webkitAudioContext;
        ctx=new AC();
        itworks=true;
        webaudio=true;
        console.log("sound: using webaudio");
        return;
      }
      try{
        var wave = document.createElement("AUDIO");
        wave.src="se/meme/gameover.mp3";
        wave.load();
        itworks=true;
        console.log("sound: using audio tag");
        if(/iPhone|iPad|iPod/i.test(navigator.userAgent)){
          lowMode = true;
          console.log("sound: low mode");
        }
      }catch(e){
        alert("sound: doesn't work.")
      };
    }
  };
  this.playse=function(name,arg){
    if(itworks && settings.Sound !== 0){
      try{
        if(typeof arg !== "undefined"){
          name+=arg;
        }
        var wavegrp=sebank[name];
        if(typeof wavegrp !== "undefined"){
          if(webaudio){
            var wave=wavegrp.insts[0];
            if(typeof wave === "undefined"){
              return; // not yet loaded
            }
            resumeAC(function(){
              var source = ctx.createBufferSource();
              source.buffer = wave;
              source.connect(ctx.destination);
              source.start();
            });
          }else{ // audiotag
            var wave=wavegrp.insts[wavegrp.curidx++];
            wavegrp.curidx%=wavegrp.insts.length;
            if(wave.tetrjsok || wave.readyState >= 4){
              if(wave.fastSeek && !lowMode){
                wave.fastSeek(0);
              }else{
                wave.currentTime=0;
              }
              wave.volume=settings.Volume/100;
              wave.play();
              wave.tetrjsok=true; // firefox.... ended.. readystate...
            }
          }
        }
      }
      catch(e){
        console.error("sound error: "+e.toString());
      }
    }
  }
  this.setsebank=function(bankid){
    if(itworks){
      try{
        var bankname=sebankArr[bankid];
        if(bankname !== void 0){
          if(waves[bankname] === void 0){
            sebank={};
            waves[bankname]=sebank;
            loadwavebank(sebank,bankname,sebankwavelist[bankname]);
            if(bankname==="meme"){
              sebank["harddrop"]=sebank["lock"];
            }
          }
          sebank=waves[bankname];
        }else{
          sebank={};
        }
      }catch(e){
        alert("sound error: "+e.toString());
      };
    }
  }
}

var sound = new Sound();