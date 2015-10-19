function XMLHTTP(url,obj)
{
  var xmlhttp=null;
  var state_Change = function()
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
            leaderboard.innerHTML = "error: "+res.info;
          }
          else if(res.msg==="ok")
          {
            leaderboard.innerHTML = ""
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
              spanname.innerText = ranks[i].name;
              spanname.style.width = "6em";
              spanname.style["text-align"] = "left";
              spanlines.innerText = ranks[i].lines + "L";
              spanlines.style.width = "2.5em";
              spantime.innerText = gettimetext(ranks[i].time);
              spantime.style.width = "4em";
              spandate.innerText = gettimedifftext(now-ranks[i].date);
              spandate.style.width = "2.5em";
              spandate.style["font-weight"] = "normal";
              if(res.mode==="score")
              {
                spanscore.innerHTML = scorestring(ranks[i].score, 7);
                spanscore.style.width = "15em";
                spanscore.style.color = "#bdf";
              }
              
              div.appendChild(spanname);
              div.appendChild(spanlines);
              div.appendChild(spantime);
              div.appendChild(spandate);
              if(res.mode==="score")
              {
                div.appendChild(spanscore);
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
            leaderboard.innerText = "Problem retrieving leaderboard data\n" + 
              xmlhttp.status + "\n" + xmlhttp.readyState + "\n" + xmlhttp.statusText + "\n" +
              xmlhttp.responseText;
          }
        }
        catch(e)
        {
          leaderboard.innerText = "Problem retrieving leaderboard data\n" + 
            e.toString();
        }
      }
    }
  }
  if (window.XMLHttpRequest)
  {// code for all new browsers
    xmlhttp=new XMLHttpRequest();
  }
  else if (window.ActiveXObject)
  {// code for IE5 and IE6
    xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
  }
  if (xmlhttp!=null)
  {
    xmlhttp.onreadystatechange=state_Change;
    xmlhttp.open("POST",url,true);
    xmlhttp.send(JSON.stringify(obj));
  }
  else
  {
    alert("Your browser does not support XMLHTTP.");
  }
}

function submitscore(obj)
{
  console.log(obj);
  XMLHTTP("http://farter.tk:8888", obj);
  //XMLHTTP("http://localhost:8888", obj);
}