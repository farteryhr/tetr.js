function handleranking(xmlhttp)
{
  if (xmlhttp.readyState==4)
  {// 4 = "loaded"
    if (xmlhttp.status==200)
    {
      var res;
      try
      {
        res = JSON.parse(xmlhttp.responseText);
        if(res.msg==="fail")
        {
          $setText(leaderboard, "error: "+res.info);
        }
        else if(res.msg==="ok")
        {
          leaderboard.innerHTML = "";
          var ranks = res.ranks;
          var now = (new Date()).getTime();
          var gettimedifftext = function(t)
          {
            t=Math.round(t/(60*1000));
            if(t<100)
              return t<=0?"!":(t+"m");
            else if(t<99*60)
              return Math.round(t/60)+"h";
            else
              return Math.round(t/(60*24))+"d";
          }
          var gettimetext = function(t)
          {
            var hs=Math.round(t/10);
            var s=~~(hs/100);
            var m=~~(s/60);
            hs-=s*100;
            s-=m*60;
            if(m==0)
              return s+"."+((hs>9?"":"0")+hs);
            else if(m<10)
              return m+":"+((s>9?"":"0")+s)+"."+((hs>9?"":"0")+hs);
            else
              return m+":"+((s>9?"":"0")+s)+"."+(~~(hs/10)); //
          }
          var getlinetxt = function(l)
          {
            if(l<1000)
              return l+"L";
            else
              return l+"";
          }
          var getscoretext = function(s)
          {
            var arr=s.split("");
            for(var i=arr.length-1-3;i>=0;i-=3){
              arr[i]+=" ";
            }
            return arr.join("");
          }
          for (var i=0;i<ranks.length;i++) {
            var div = document.createElement('div');
            var spanname = document.createElement('span');
            var spanlines = document.createElement('span');
            var spantime = document.createElement('span');
            var spandate = document.createElement('span');
            var spanscore = document.createElement('span');
            $setText(spanname,ranks[i].name);
            spanname.style.width = "6em";
            spanname.style["text-align"] = "left";
            $setText(spanlines,ranks[i].lines + "L");
            spanlines.style.width = "2.5em";
            $setText(spantime,gettimetext(ranks[i].time));
            spantime.style.width = "4em";
            $setText(spandate,gettimedifftext(now-ranks[i].date));
            spandate.style.width = "2.5em";
            spandate.style["font-weight"] = "normal";
            if(res.mode==="score")
            {
              $setText(spanscore,scorestring(ranks[i].score, 7));
              spanscore.style.width = "15em";
              spanscore.classList.add("rank-score");
            }
            
            div.appendChild(spanname);
            div.appendChild(spanlines);
            div.appendChild(spantime);
            div.appendChild(spandate);
            if(res.mode==="score")
            {
              div.appendChild(spanscore);
            }
            if(typeof res.ranks[i].replay==="string")
            {
              div.classList.add("has-replay");
              var replaykey=ranks[i].replay;
              var closure=function(a){return a}
              div.addEventListener("click",function(k){
                return function(){
                  fetchreplay(k);
                }
              }(replaykey));
            }
            leaderboard.appendChild(div);
            if(res.mode==="score" && i+1===5)
            {
              break;
            }
          }
        }
        else
        {
          $setText(leaderboard, "Problem retrieving leaderboard data\n" + 
            xmlhttp.status + "\n" + xmlhttp.readyState + "\n" + xmlhttp.statusText + "\n" +
            xmlhttp.responseText
          );
        }
      }
      catch(e)
      {
        $setText(leaderboard, "Problem retrieving leaderboard data\n" + 
          e.toString()
        );
      }
    }
  }
}
function handlereplay(xmlhttp)
{
  if (xmlhttp.readyState==4)
  {// 4 = "loaded"
    if (xmlhttp.status==200)
    {
      var res;
      try
      {
        res = JSON.parse(xmlhttp.responseText);
        if(res.msg==="fail")
        {
          alert("error: "+res.info);
        }
        else if(res.msg==="ok")
        {
          showreplaydata(res.replay);
        }
        else
        {
          console.log("Problem retrieving leaderboard data\n" + 
            xmlhttp.status + "\n" + xmlhttp.readyState + "\n" + xmlhttp.statusText + "\n" +
            xmlhttp.responseText
          );
        }
      }
      catch(e)
      {
        console.log("Problem retrieving leaderboard data\n" + 
          e.toString()
        );
      }
    }
  }
}

var hostaddr=
  "http://farter.cn:8888";
  //"http://localhost:8888";

function submitscore(obj)
{
  console.log(obj);
  XmlHttpPostJson(hostaddr, obj, handleranking);
}
function fetchreplay(key)
{
  XmlHttpPostJson(hostaddr, {req:"replay", replaykey:key}, handlereplay);
}