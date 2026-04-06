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
                    // console.log("audio decode success "+iname+":"+audioBuf.length);
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
          wave.setAttribute("preload","none");
          wave.setAttribute("x-webkit-airplay","deny");
          wave.setAttribute("disableremoteplayback","true");
          wave.removeAttribute("controls");
          wave.load();
          dest[iname].insts.push(wave);
        }
      }
    }
  }
  var checkwavebank=function(bank){ // sometimes blocked by calling "load" not in specified user interaction
    for(var iname in bank){
      var insts=bank[iname].insts;
      for(var j=0;i<insts.length;j++){
        if(webaudio){
          // has retry
        }else{
          var wave = insts[i];
          if(wave.readyState===0){
            var url=wave.src;
            insts[i]=null;
            wave=document.createElement("AUDIO");
            wave.src=url;
            
            wave.load(); // on some browser, initial preload doesn't work, even not working in rAF, even not working like this
          }
        }
      }
    }
  
  }
  this.init=function(){
    if(itworks===false){
      var AC=window.AudioContext||window.webkitAudioContext;
      if((window.ArrayBuffer!==void 0)
        && AC && AC.prototype.createBufferSource && AC.prototype.decodeAudioData
        && window.location.protocol!=="file:"
        && !( 
          /iP.{1,4} OS 6_/i.test(navigator.userAgent) ||
          /iP.{1,4} OS 7_0_/i.test(navigator.userAgent) // not sure
        )
      ){
        ctx=new AC();
        itworks=true;
        webaudio=true;
        debugmsg("sound: using webaudio")
        console.log("sound: using webaudio");
        return;
      }
      try{
        var wave = document.createElement("AUDIO");
        wave.src="se/meme/gameover.mp3";
        wave.load();
        itworks=true;
        debugmsg("sound: using audio tag")
        console.log("sound: using audio tag");
        if(/iPhone|iPad|iPod/i.test(navigator.userAgent)){
          lowMode = true;
          debugmsg("sound: single mode")
          console.log("sound: single mode");
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
              // https://webaudioapi.com/book/Web_Audio_API_Boris_Smus_html/appa.html
              var source = ctx.createBufferSource();
              source.buffer = wave;
              source.loop = false;
              if(typeof source.gain==="number"){
                source.gain=1;
              } else if(source.gain) { // ios6-7 audioparam but fail on my 7.0.4
                source.gain.setValueAtTime(1, ctx.currentTime);
              }
              var gain = ctx.createGain();
              gain.gain.setValueAtTime(settings.Volume/100, ctx.currentTime);
              
              source.connect(gain);
              gain.connect(ctx.destination);
              // noteGrainOn noteOn noteOff ???
              if(source.noteOn){ // ios6-7 but fail?
                source.noteOn(ctx.currentTime+0.001);
              }else{
                source.start(ctx.currentTime);
              }
              window.setTimeout(function(){
                if(source.noteOff){
                  source.noteOff(ctx.currentTime);
                }else{
                  source.stop(ctx.currentTime);
                }
                source.disconnect(gain);
                gain.disconnect(ctx.destination);
              },wave.duration*1000+100);
            });
          }else{ // audiotag
            var wave=wavegrp.insts[wavegrp.curidx++];
            wavegrp.curidx%=wavegrp.insts.length;
            if(wave.tetrjsok || wave.readyState >= 4){
              wave.pause();
              if(wave.fastSeek && !lowMode){
                wave.fastSeek(0);
              }else{
                wave.currentTime=0;
              }
              wave.volume=settings.Volume/100;
              wave.play();
              wave.tetrjsok=true; // firefox.... ended.. readystate...
            }else{
              //if(wave.readyState===0){
              //  wave.load(); // on some browser, initial preload doesn't work, even not working in rAF
              //} // may cause lag
              debugmsg(name+" "+wave.readyState+" "+wave.src)
            }
          }
        }
      }
      catch(e){
        console.error("sound error: "+e.toString());
      }
    }
  }
  this.setsebank=function(bankid){ // called in click/touchstart
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
          }else{
            checkwavebank(waves[bankname]);
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