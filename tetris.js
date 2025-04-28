/*
Author: Simon Laroche
Site: http://simon.lc/
Demo: http://simon.lc/tetr.js

Note: Before looking at this code, it would be wise to do a bit of reading about
the game so you know why some things are done a certain way.
*/
'use strict';

/**
 * Playfield.
 */
var cellSize;
var column;

/**
 * Get html elements.
 */
var divdebug = $$('divdebug');
function debugmsg(s){
  $setText(divdebug, s);
}

var msg = $$('msg');
var msgdiv = $$('msgdiv');
var stats = $$('stats');
var statsTime = $$('time');
var statsLines = $$('line');
var statsPiece = $$('piece');
var statsScore = $$('score');
var statsLevel = $$('level');
var statsPenalty = $$('penalty');

var h3 = document.getElementsByTagName('h3');
var set = $$('settings');
var leaderboard = $$('leaderboard');
var replaydata = $$('replaydata');
var hidescroll = $$('hidescroll');

// Get canvases and contexts
var holdCanvas = $$('hold');
var bgStackCanvas = $$('bgStack');
var stackCanvas = $$('stack');
var activeCanvas = $$('active');
var previewCanvas = $$('preview');
var spriteCanvas = $$('sprite');

var timeCanvas = $$('time').childNodes[0];

var holdCtx = holdCanvas.getContext('2d');
var bgStackCtx = bgStackCanvas.getContext('2d');
var stackCtx = stackCanvas.getContext('2d');
var activeCtx = activeCanvas.getContext('2d');
var previewCtx = previewCanvas.getContext('2d');
var spriteCtx = spriteCanvas.getContext('2d');

var timeCtx = timeCanvas.getContext('2d');

var touchLeft = $$('touchLeft');
var touchRight = $$('touchRight');
var touchDown = $$('touchDown');
var touchDrop = $$('touchDrop');
var touchHold = $$('touchHold');
var touchRotLeft = $$('touchRotLeft');
var touchRotRight = $$('touchRotRight');
var touchRot180 = $$('touchRot180');

var touchLayout = $$('touchLayout');
var touchOverlay = $$('touchOverlay');

var touchButtons = [
  touchLeft, touchRight, touchDown, touchDrop,
  touchHold, touchRotRight, touchRotLeft, touchRot180
];
touchLeft.keyName = "moveLeft";
touchRight.keyName = "moveRight";
touchDown.keyName = "moveDown";
touchDrop.keyName = "hardDrop";
touchHold.keyName = "holdPiece";
touchRotRight.keyName = "rotRight";
touchRotLeft.keyName = "rotLeft";
touchRot180.keyName = "rot180";

var nLayouts = 7, currLayout = -2 /* none */;

/**
* frame counters
*/

var frame;
var frameSkipped;

/**
* for dig challenge mode
*/

var frameLastRise;
var frameLastHarddropDown;

/**
* for dig zen mode
*/

var digZenBuffer;
var lastPiecesSet;

/**
* Pausing variables
*/

var lastPsUpsTime;
var pauseTime;
var startTime;
var scoreTime;
var scoreStartTime;

/**
 * 0 = Normal
 * 1 = win
 * 2 = countdown
 * 3 = game not played
 * 9 = loss
 */
var gameState = 3;

var paused = false;
var lineLimit;

var replay;
var watchingReplay = false;
var gametype;
var gameparams;
//TODO Make dirty flags for each canvas, draw them all at once during frame call.
// var dirtyHold, dirtyActive, dirtyStack, dirtyPreview;
var lastX, lastY, lastPos, lastLockDelay, landed;

// Scoring related status
var b2b;
var combo;
var level;
var allclear;

// Stats
var lines;
var score;
var statsFinesse;
var piecesSet;
var timePenalty; // test, for symmetry, unit: sec

// dig related
var digLines = [];

// key status
var keysDown, lastKeys;
var keysDownTouch, keysDownKeyboard;
// transition, lasts for one frame
var keysPushing, keysPopping;
//var released;

var binds = {
  pause: 27,
  moveLeft: 37,
  moveRight: 39,
  moveLeft3: 0,
  moveRight3: 0,
  moveDown: 40,
  hardDrop: 32,
  holdPiece: 67,
  rotRight: 88,
  rotLeft: 90,
  rot180: 16,
  retry: 82
};

var lastWinWidth, lastWinHeight, lastSettSize, lastNextSide;

function resize() {
  var a = $$('a');
  var b = $$('b');
  var c = $$('c');
  var d = $$('d');
  var content = $$('content');
  
  var winWidth = window.innerWidth, winHeight = window.innerHeight;
  var nextSide = settings.NextSide;
  var settSize = settings.Size;
  if (winWidth === lastWinWidth &&
    winHeight === lastWinHeight &&
    settSize === lastSettSize &&
    nextSide === lastNextSide
  ){
    // ...
  } else{
    
    
    // the big operations that forces DOM reflow
    if (lastNextSide !== nextSide) {
      content.removeChild(c);
      content.removeChild(b);
      content.removeChild(d);
      if (nextSide === 1) {
        content.appendChild(c);
        content.appendChild(b);
        content.appendChild(d);
      } else {
        content.appendChild(d);
        content.appendChild(b);
        content.appendChild(c);
      }
    }
    
    // TODO Finalize this.
    // Aspect ratio: 1.024
    var padH = 12;
    var screenHeight = winHeight - padH * 2;
    var screenWidth = ~~(screenHeight * 1.0);
    if (screenWidth > winWidth)
      screenHeight = ~~(window.innerWidth / 1.0);

    cellSize = Math.max(~~(screenHeight / 20), 10);
    if (settings.Size === 1 && cellSize >= 16) cellSize = 16;
    else if (settings.Size === 2 && cellSize >= 24) cellSize = 24;
    else if (settings.Size === 3 && cellSize >= 32) cellSize = 32;
    else if (settings.Size === 4 && cellSize >= 48) cellSize = 48;

    var pad = (window.innerHeight - (cellSize * 20 + 2));
    var padFinal = Math.min(pad/2, padH);
    //console.log(pad);
    content.style.padding =
      //"0 0";
      //(pad / 2) + 'px' + ' 0';
      (padFinal) + 'px' + ' 0';

    stats.style.bottom =
      //(pad) + 'px';
      //(pad / 2) + 'px';
      (pad - padFinal) + 'px';
      //(pad - padH) + 'px';

    // Size elements
    a.style.padding = '0 0.5rem ' + ~~(cellSize / 2) + 'px';

    stackCanvas.width = activeCanvas.width = bgStackCanvas.width = cellSize * 10;
    stackCanvas.height = activeCanvas.height = bgStackCanvas.height = cellSize * 20;
    b.style.width = stackCanvas.width + 'px';
    b.style.height = stackCanvas.height + 'px';

    holdCanvas.width = cellSize * 4;
    holdCanvas.height = cellSize * 4;
    a.style.width = holdCanvas.width + 'px';
    a.style.height = holdCanvas.height + 'px';

    previewCanvas.width = cellSize * 4;
    previewCanvas.height = stackCanvas.height - cellSize * 2;
    c.style.width = previewCanvas.width + 'px';
    c.style.height = b.style.height;

    // Scale the text so it fits in the thing.
    // TODO get rid of extra font sizes here.
    msgdiv.style.lineHeight = b.style.height;
    msg.style.fontSize = ~~(stackCanvas.width / 6) + 'px';
    msg.style.lineHeight = msg.style.fontSize;
    stats.style.fontSize = ~~(stackCanvas.width / 11) + 'px';
    document.documentElement.style.fontSize = ~~(stackCanvas.width / 16) + 'px';

    for (var i = 0; i < h3.length; i++) {
      h3[i].style.lineHeight = (cellSize * 2) + 'px';
      h3[i].style.fontSize = stats.style.fontSize;
    }
    stats.style.width = d.clientWidth + 'px';

    timeCanvas.width = d.clientWidth;
    timeCanvas.height = timeCanvas.clientHeight || timeCanvas.offsetHeight;
    timeCtx.fillStyle = "#fff";
    timeCtx.font = 'bold 1.125em Roboto, "Trebuchet MS"';
    timeCtx.textAlign = "center";
    timeCtx.textBaseline = "middle";

    touchButtonsLayout();
    touchButtonsToggle();

    lastWinWidth = winWidth;
    lastWinHeight = winHeight;
    lastSettSize = settSize;
    lastNextSide = nextSide;
  }

  // force redraw regardless of dirty flags (even non-dirty)
  
  // Redraw graphics
  makeSprite();

  bg(bgStackCtx);
  
  //if (gameState === 0) {
  try {
    piece.draw();
    stack.draw();
    preview.draw();
    hold.draw();
    statistics();
    statisticsStack();
  } catch(e) {
  }
  //}
}
addEventListener('resize', resize, false);
addEventListener('load', resize, false);

/**
 * ========================== Model ===========================================
 */

/**
 * Resets all the settings and starts the game.
 */
function init(gt, params) {
  if (gt === 'replay') {
    watchingReplay = true;
    if(params !== void 0) {
      try {
        if(typeof params !== "string")
          throw "wtf";
        if(params === "" || params.slice(0,1) !=="{")
          throw "please paste replay data, correctly..."
        replay = JSON.parse(params.replace(/\n/g,""));
        if(typeof replay !== "object")
          throw "json parse fail";
        if((replay.gametype === void 0)
          || (replay.keys === void 0)
          || (replay.settings === void 0)
          || (replay.seed === void 0)
        ) {
          throw "something's missing...";
        }
        try{
          tryUpgradeSetting(replay.settings);
        }catch(e){
          alert("replay too old, failed to auto-upgrade... 回放数据过于古代，自动升级失败...\n" + e);
          return;
        }
        replay.keys = keysDecode(replay.keys);
        if(replay.keys === null)
          throw "keys decode fail"
      } catch(e) {
        alert("invalid replay data... 回放数据有误...\n" + e.toString());
        return;
      }
    }
    gametype = replay.gametype;
    gameparams = replay.gameparams || {};
    settings = replay.settings; // by reference
    rng.seed = replay.seed;
  } else {
    watchingReplay = false;
    settings = ObjectClone(mySettings); // by value: prevent from being modified when paused
    gametype = gt;
    gameparams = params || {};

    var seed = ~~(Math.random() * 2147483645) + 1;
    rng.seed = seed;

    replay = {};
    replay.keys = {};
    // TODO Make new seed and rng method.
    replay.seed = seed;
    replay.gametype = gametype;
    replay.gameparams = gameparams;
    replay.settings = settings;
  }

  if(gametype === void 0) //sometimes happens.....
    gametype = 0;

  //html5 mobile device sound
  if(settings.Sound !== 0){
    sound.init();
  }
  sound.setsebank(settings.Sound);

  //Reset
  column = 0;
  keysDown = 0;
  lastKeys = 0;
  keysDownTouch = keysDownKeyboard = 0;
  //TODO Check if needed.
  piece = new Piece();

  frame = 0;
  frameSkipped = 0;
  lastPos = 'reset';
  stack.new(10, 20, 4);
  hold.piece = void 0;

  preview.init()
  //preview.draw();

  b2b = 0;
  combo = 0;
  level = 0;
  allclear = 0;
  statsFinesse = 0;
  lines = 0;
  score = bigInt(0);
  piecesSet = 0;

  clear(stackCtx);
  clear(activeCtx);
  clear(holdCtx);
  
  timePenalty = 0;
  
  if(gametype === 0) // sprint
    lineLimit = gameparams.lineLimit || 40;
  else if(gametype === 5) // score attack
    lineLimit = 200;
  else
    lineLimit = 0;

  digLines = [];
  if (gametype === 3) {
    frameLastRise = 0;
    frameLastHarddropDown = 0;
  }
  if (gametype === 4) {
    // Dig Race
    // make ten random numbers, make sure next isn't the same as last? t=rnd()*(size-1);t>=arr[i-1]?t++:; /* farter */
    //TODO make into function or own file.
    if (gameparams.digraceType === void 0 || gameparams.digraceType === "checker") {
      // harder digrace: checkerboard
      digLines = range(stack.height - 10, stack.height);
      $setText(statsLines,10);
      for (var y = stack.height - 1; y > stack.height - 10 - 1; y--) {
        for (var x = 0; x < stack.width; x++) {
          if ((x+y)&1)
            stack.grid[x][y] = 8;
        }
      }
    } else if(gameparams.digraceType === "easy") {
      var begin = ~~(rng.next()*stack.width);
      var dire = (~~(rng.next()*2))*2-1;
      digLines = range(stack.height - 10, stack.height);
      $setText(statsLines,10);
      for (var y = stack.height - 1; y > stack.height - 10 - 1; y--) {
        for (var x = 0; x < stack.width; x++) {
          var n = begin+dire*y;
          var b;
          if (gameparams.symmetry === 1){
            b = (n+x).mod(stack.width)!==0 &&
              (n+(stack.width-1-x)).mod(stack.width)!==0;
          } else{
            b = (n+x).mod(stack.width)!==0;
          }
          if (b) {
            stack.grid[x][y] = 8;
          }
        }
      }
    } else if(gameparams.digraceType === "map") {
      var s = gameparams.map;
      if(!s){
        s=".aaaa.aa.. .a.a.a..a. .a.a.a.aa. .a.a.aa.a. .a.a.a.aa. a...a..... aa.a.a...a a.a.a.a.a. a.a.a..a.. a.a.a.a.a. .aa.aa...a .......... ..4.4.4... ..b.b.b... ..b.b.b... .9999999.. .4434443.. .3444344.. ".replace(/a/g, ""+(1+~~(rng.next()*7))).replace(/b/g, ""+(1+~~(rng.next()*7)));
      }
      console.assert(s.length%(stack.width+1)==0);
      var h = ~~(s.length/(stack.width+1));
      for(var y=0; y<h; y++){
        for(var x=0;x<stack.width;x++){
          var c=s[y*(stack.width+1)+x];
          if(c!=="."){
            stack.grid[x][y+stack.height-h]=+c;
          }
        }
      }
      digLines=range(stack.height-h,stack.height);
    }
    //stack.draw(); //resize
  }
  if (gametype === 7){
    lastPiecesSet = 0;
    digZenBuffer = 0;
  }
  if (gametype === 1 && gameparams.marathonType === 1){
    if (settings.ARR < 1){
      settings.ARR = 1;
    }
    if (settings.SoftDrop > 7){
      settings.SoftDrop = 7;
    }
    if (settings.Next > 1){
      settings.Next = 1;
    }
  }
  if (gametype === 0){
    // don't care about digLines since it's not dig mode
    if (gameparams.lineLimit === 1){
      for (var y = stack.height - 1; y > stack.height - 10 - 1; y--) {
        stack.grid[~~(rng.next()*stack.width)][y] = 8;
      }
    } else if(gameparams.lineLimit === 25){
      for (var y = stack.height - 1; y > stack.height - 10 - 1; y--) {
        var pattern = ~~(rng.next() * 1022) + 1;
        for (var x = 0; x < stack.width; x++) {
          if ((1<<x)&pattern)
            stack.grid[x][y] = ~~(rng.next() * 8) + 1;
        }
      }
    }
  }

  menu();

  // Only start a loop if one is not running already.
  // don't keep looping when not played
  // in the 0~16ms after the last frame, inloop==true and gameState==3
  // retry is instant event, so double RAF here... 
  console.log(paused,gameState,inloop);
  if (/*paused || gameState === 3*/ !inloop) {
    console.log("start inloop",inloop);
    inloop=true;
    requestAnimFrame(gameLoop);
  }
  startTime = Date.now();
  lastPsUpsTime = 0;
  pauseTime = 0;
  scoreTime = 0;
  paused = false;
  gameState = 2;
  
  touchButtonsToggle();

  resize();
}

/**
 * Shim.
 */
window.requestAnimFrame = (function () {
  return window.requestAnimationFrame       ||
         window.mozRequestAnimationFrame    ||
         window.webkitRequestAnimationFrame ||
         function (callback) {
           window.setTimeout(callback, 1000 / 60);
         };
})();

function pause() {
  if (Date.now() - lastPsUpsTime < 500) {
    return;
  }
  if (gameState === 0 || gameState === 4) {
    paused = true;
    lastPsUpsTime = Date.now();
    $setText(msg,"Paused");
    menu(4);
    touchButtonsToggle();
  }
}

function unpause() {
  if (Date.now() - lastPsUpsTime < 500) {
    return;
  }
  paused = false;
  touchButtonsToggle();
  pauseTime += Date.now() - lastPsUpsTime;
  lastPsUpsTime = Date.now();
  $setText(msg,'');
  menu();
  console.log("start inloop", inloop);
  inloop = true;
  requestAnimFrame(gameLoop);
  touchButtonsToggle();
}

/**
 * Park Miller "Minimal Standard" PRNG.
 */
//TODO put random seed method in here.
var rng = new (function() {
  this.seed = 1;
  this.next = function() {
    // Returns a float between 0.0, and 1.0
    return (this.gen() / 2147483647);
  }
  this.gen = function() {
    return this.seed = (this.seed * 16807) % 2147483647;
  }
})();

function scorestring(s, n){
  var strsplit = s.split("");
  var spacetoggle = 0;
  for (var i = strsplit.length - 1 - 3; i >= 0; i -= 3) {
    strsplit[i] += (spacetoggle === n-1 ?" ":"\xA0");
    spacetoggle = (spacetoggle + 1) % n;
  }
  return strsplit.join("");
}

function updateScoreTime(){
  scoreTime = Date.now() - scoreStartTime - pauseTime;
}

/**
 * Draws the stats next to the tetrion.
 */
function statistics() {

  var time = scoreTime || 0;
  var seconds = ((time % 60000) / 1000).toFixed(2);
  var minutes = ~~(time / 60000);
  var displayTime =
    (minutes < 10 ? '0' : '') + minutes +
    (seconds < 10 ? ':0' : ':') + seconds;
  var fsbl = 30; /* frameskip bar length */
  var pos = frameSkipped.mod(fsbl*2);
  var skipL = pos, skipR = pos;
  skipL = (skipL-fsbl<0)?0:(skipL-fsbl);
  skipR = (skipR>fsbl)?fsbl:skipR;
  skipL = skipL/fsbl*timeCanvas.width;
  skipR = skipR/fsbl*timeCanvas.width;

  timeCtx.clearRect(0, 0, timeCanvas.width, timeCanvas.height);
  timeCtx.fillText(displayTime, timeCanvas.width/2, timeCanvas.height/2);
  timeCtx.fillRect(skipL,timeCanvas.height-0.4,skipR,timeCanvas.height);
}

/**
 * Draws the stats about the stack next to the tetrion.
 */
// /* farter */
function statisticsStack() {
  $setText(statsPiece, piecesSet);

  if(gametype === 0 || gametype === 5) {
    $setText(statsLines, lineLimit - lines);
    $setText(statsLevel, "");
  }else if(gametype === 1 || gametype === 6 || gametype === 7){
    $setText(statsLines, lines);
    $setText(statsLevel, "Lv. " + level);
  }else if (gametype === 3){
    if (gameparams.digOffset || gameparams.digOffset !== 0){
      $setText(statsLevel, gameparams.digOffset + "+");
    }else{
      $setText(statsLevel, "");
    }
    $setText(statsLines, lines);
  }//else if (gametype === 4){
  //  $setText(statsLines, digLines.length);
  //}
  else{
    $setText(statsLines, lines);
    $setText(statsLevel, "");
  }
  

  if(timePenalty > 0){
    var seconds = timePenalty % 60;
    var minutes = (timePenalty - seconds) / 60;
    $setText(statsPenalty,
      //"+" + minutes + (seconds < 10 ? ':0' : ':') + seconds
      "+" + timePenalty + "s"
    );
  }else{
    $setText(statsPenalty, "");
  }

  var light=['#ffffff','#EFB08C','#EDDD82','#8489C7','#FFDB94','#EFAFC5','#98DF6E','#6FC5C5','#9A7FD1','#78D4A3'];

  statsScore.style.color=(b2b===0?'':light[b2b%10]);
  statsScore.style.textShadow=(combo===0?'':('0 0 0.5em '+light[(combo-1)%10]));
  $setText(statsScore,scorestring(score.toString(), 2));
  
  stack.statisticsDirty = false;
}
// ========================== View ============================================

/**
 * Draws grid in background.
 */
function bg(ctx) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  if (settings.Grid === 1) {
    ctx.fillStyle = '#1c1c1c';
    for (var x = -1; x < ctx.canvas.width + 1; x += cellSize) {
      ctx.fillRect(x, 0, 2, ctx.canvas.height);
    }
    for (var y = -1; y < ctx.canvas.height + 1; y += cellSize) {
      ctx.fillRect(0, y, ctx.canvas.width, 2);
    }
  }
}

/**
 * Draws a pre-rendered mino.
 */
function drawCell(x, y, color, ctx, darken) {
  x = Math.floor(x * cellSize);
  y = Math.floor(y * cellSize);
  ctx.drawImage(spriteCanvas, color * cellSize, 0, cellSize, cellSize, x, y, cellSize, cellSize);
  if (darken) {
    //ctx.globalCompositeOperation = 'source-atop';
    ctx.fillRect(x, y, cellSize, cellSize);
    //ctx.globalCompositeOperation = 'source-over';
  }
}

/**
 * Pre-renders all mino types in all colors.
 */
function makeSprite() {
  var shaded = [
    // 0         +10        -10        -20
    ['#c1c1c1', '#dddddd', '#a6a6a6', '#8b8b8b'],
    ['#25bb9b', '#4cd7b6', '#009f81', '#008568'],
    ['#3397d9', '#57b1f6', '#007dbd', '#0064a2'],
    ['#e67e23', '#ff993f', '#c86400', '#a94b00'],
    ['#efc30f', '#ffdf3a', '#d1a800', '#b38e00'],
    ['#9ccd38', '#b9e955', '#81b214', '#659700'],
    ['#9c5ab8', '#b873d4', '#81409d', '#672782'],
    ['#e64b3c', '#ff6853', '#c62c25', '#a70010'],
    ['#898989', '#a3a3a3', '#6f6f6f', '#575757'],
    ['#c1c1c1', '#dddddd', '#a6a6a6', '#8b8b8b'],
  ];
  var glossy = [
    //25         37         52         -21        -45
    ['#ffffff', '#ffffff', '#ffffff', '#888888', '#4d4d4d'],
    ['#7bffdf', '#9fffff', '#ccffff', '#008165', '#00442e'],
    ['#6cdcff', '#93feff', '#c2ffff', '#00629f', '#002c60'],
    ['#ffc166', '#ffe386', '#ffffb0', '#aa4800', '#650500'],
    ['#ffff6a', '#ffff8c', '#ffffb8', '#b68a00', '#714f00'],
    ['#efff81', '#ffffa2', '#ffffcd', '#6b9200', '#2c5600'],
    ['#dc9dfe', '#ffbeff', '#ffe9ff', '#5d287e', '#210043'],
    ['#ff9277', '#ffb497', '#ffe0bf', '#a7000a', '#600000'],
    ['#cbcbcb', '#ededed', '#ffffff', '#545454', '#1f1f1f'],
    ['#ffffff', '#ffffff', '#ffffff', '#888888', '#4d4d4d'],
  ];
  var tgm = [
    ['#ababab', '#5a5a5a', '#9b9b9b', '#626262'],
    ['#00e8f0', '#0070a0', '#00d0e0', '#0080a8'],
    ['#00a8f8', '#0000b0', '#0090e8', '#0020c0'],
    ['#f8a800', '#b84000', '#e89800', '#c85800'],
    ['#e8e000', '#886800', '#d8c800', '#907800'],
    ['#78f800', '#007800', '#58e000', '#008800'],
    ['#f828f8', '#780078', '#e020e0', '#880088'],
    ['#f08000', '#a00000', '#e86008', '#b00000'],
    ['#7b7b7b', '#303030', '#6b6b6b', '#363636'],
    ['#ababab', '#5a5a5a', '#9b9b9b', '#626262'],
  ];

  spriteCanvas.width = cellSize * 10;
  spriteCanvas.height = cellSize;
  for (var i = 0; i < 10; i++) {
    var x = i * cellSize;
    if (settings.Block === 0) {
      // Shaded
      spriteCtx.fillStyle = shaded[i][1];
      spriteCtx.fillRect(x, 0, cellSize, cellSize);

      spriteCtx.fillStyle = shaded[i][3];
      spriteCtx.fillRect(x, cellSize / 2, cellSize, cellSize / 2);

      spriteCtx.fillStyle = shaded[i][0];
      spriteCtx.beginPath();
      spriteCtx.moveTo(x, 0);
      spriteCtx.lineTo(x + cellSize / 2, cellSize / 2);
      spriteCtx.lineTo(x, cellSize);
      spriteCtx.fill();

      spriteCtx.fillStyle = shaded[i][2];
      spriteCtx.beginPath();
      spriteCtx.moveTo(x + cellSize, 0);
      spriteCtx.lineTo(x + cellSize / 2, cellSize / 2);
      spriteCtx.lineTo(x + cellSize, cellSize);
      spriteCtx.fill();
    } else if (settings.Block === 1) {
      // Flat
      spriteCtx.fillStyle = shaded[i][0];
      spriteCtx.fillRect(x, 0, cellSize, cellSize);
    } else if (settings.Block === 2) {
      // Glossy
      var k = Math.max(~~(cellSize * 0.1), 1);

      var grad = spriteCtx.createLinearGradient(x, 0, x + cellSize, cellSize);
      grad.addColorStop(0.5, glossy[i][3]);
      grad.addColorStop(1, glossy[i][4]);
      spriteCtx.fillStyle = grad;
      spriteCtx.fillRect(x, 0, cellSize, cellSize);

      var grad = spriteCtx.createLinearGradient(x, 0, x + cellSize, cellSize);
      grad.addColorStop(0, glossy[i][2]);
      grad.addColorStop(0.5, glossy[i][1]);
      spriteCtx.fillStyle = grad;
      spriteCtx.fillRect(x, 0, cellSize - k, cellSize - k);

      var grad = spriteCtx.createLinearGradient(x + k, k, x + cellSize - k, cellSize - k);
      grad.addColorStop(0, shaded[i][0]);
      grad.addColorStop(0.5, glossy[i][0]);
      grad.addColorStop(0.5, shaded[i][0]);
      grad.addColorStop(1, glossy[i][0]);
      spriteCtx.fillStyle = grad;
      spriteCtx.fillRect(x + k, k, cellSize - k * 2, cellSize - k * 2);

    } else if (settings.Block === 3 || settings.Block === 4) {
      var k = Math.max(~~(cellSize * 0.125), 1);

      spriteCtx.fillStyle = tgm[i][1];
      spriteCtx.fillRect(x, 0, cellSize, cellSize);
      spriteCtx.fillStyle = tgm[i][0];
      spriteCtx.fillRect(x, 0, cellSize, ~~(cellSize / 2));

      var grad = spriteCtx.createLinearGradient(x, k, x, cellSize - k);
      grad.addColorStop(0, tgm[i][2]);
      grad.addColorStop(1, tgm[i][3]);
      spriteCtx.fillStyle = grad;
      spriteCtx.fillRect(x + k, k, cellSize - k*2, cellSize - k*2);

      var grad = spriteCtx.createLinearGradient(x, k, x, cellSize);
      grad.addColorStop(0, tgm[i][0]);
      grad.addColorStop(1, tgm[i][3]);
      spriteCtx.fillStyle = grad;
      spriteCtx.fillRect(x, k, k, cellSize - k);

      var grad = spriteCtx.createLinearGradient(x, 0, x, cellSize - k);
      grad.addColorStop(0, tgm[i][2]);
      grad.addColorStop(1, tgm[i][1]);
      spriteCtx.fillStyle = grad;
      spriteCtx.fillRect(x + cellSize - k, 0, k, cellSize - k);
    }
  }
}

/**
 * Clear canvas.
 */
function clear(ctx) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

/**
 * Draws a 2d array of minos.
 */
function draw(tetro, cx, cy, ctx, color, darkness) {
  var darken = false;
  if (darkness) {
    darken = true;
    ctx.fillStyle = 'rgba(0,0,0,' + darkness + ')';
  }
  for (var x = 0; x < tetro.length; x++) {
    for (var y = 0; y < tetro[x].length; y++) {
      if (tetro[x][y]) {
        drawCell(x + cx, y + cy, color !== void 0 ? color : (tetro[x][y] & cellFlags.maskColor), ctx, darken);
      }
    }
  }
}

// ========================== Controller ======================================

function keyCodeToKeyFlag(keyCode) {
  if (keyCode === binds.moveLeft) {
    return flags.moveLeft;
  } else if (keyCode === binds.moveRight) {
    return flags.moveRight;
  } else if (keyCode === binds.moveDown) {
    return flags.moveDown;
  } else if (keyCode === binds.hardDrop) {
    return flags.hardDrop;
  } else if (keyCode === binds.rotRight) {
    return flags.rotRight;
  } else if (keyCode === binds.rotLeft) {
    return flags.rotLeft;
  } else if (keyCode === binds.rot180) {
    return flags.rot180;
  } else if (keyCode === binds.moveLeft3) {
    return flags.moveLeft3;
  } else if (keyCode === binds.moveRight3) {
    return flags.moveRight3;
  } else if (keyCode === binds.holdPiece) {
    return flags.holdPiece;
  } else {
    return 0;
  }
}

function keyUpDown(e) {
  // TODO send to menu or game depending on context.
  if ([32,37,38,39,40].indexOf(e.keyCode) !== -1)
    e.preventDefault();
  //TODO if active, prevent default for binded keys
  //if (bindsArr.indexOf(e.keyCode) !== -1)
  //  e.preventDefault();
  if (e.type === "keydown" && e.keyCode === binds.pause) {
    if (paused) {
      unpause();
    } else {
      pause();
    }
  }
  if (e.type === "keydown" && e.keyCode === binds.retry) {
    init(gametype,gameparams);
  }
  if (!watchingReplay) {
    var flag = keyCodeToKeyFlag(e.keyCode);
    if (e.type === "keydown") {
      keysDownKeyboard |= flag;
    } else if (e.type === "keyup") {
      keysDownKeyboard &= ~flag;
    }
  }
}
addEventListener('keydown', keyUpDown, false);
addEventListener('keyup', keyUpDown, false);

// ========================== Loop ============================================

// when game isn't started, paused === false
function isGameRunning(){
  return !paused && gameState !== 3;
}

//TODO Cleanup gameloop and update.
/**
 * Runs every frame.
 */
function update() {

  //if (piece.dead) {
  //  piece.new(preview.next());
  //}

  do { // for breaking
    if (flags.holdPiece & keysPushing) {
      piece.hold(); // may cause death
    }
    if (gameState === 9) {
      break;
    }

    if (!gameparams.noRotation) {
      if (flags.rotLeft & keysPushing) {
        piece.rotate(-1);
        piece.finesse++;
      } else if (flags.rotRight & keysPushing) {
        piece.rotate(1);
        piece.finesse++;
      } else if (flags.rot180 & keysPushing) {
        piece.rotate(2);
        piece.finesse++;
      }
    }

    piece.checkShift();

    if (flags.moveDown & keysDown) {
      piece.shiftDown();
      //piece.finesse++;
    }
    if (flags.hardDrop & keysPushing) {
      frameLastHarddropDown = frame;
      piece.hardDrop();
    }

    piece.update(); // may turn to locked, even lock out death.
    if (gameState === 9) {
      break;
    }

    if(gametype === 3) { //Dig
      var fromLastRise = frame-frameLastRise;
      var fromLastHD = (flags.hardDrop & keysDown)?(frame-frameLastHarddropDown):0;
      var curStage = 0, objCurStage;
      while(
        curStage<arrStages.length &&
        arrStages[curStage].begin <= lines + (gameparams.digOffset || 0)
      ) {
        curStage++;
      }
      curStage--;
      objCurStage = arrStages[curStage];
      if(fromLastRise >= objCurStage.delay || (fromLastHD >= 20 && fromLastRise >= 15)) {
        var arrRow = [8,8,8,8,8,8,8,8,8,8];
        //IJLOSTZ
        var arrRainbow=[
          2,-1,1,5,4,3,7,6,-1,8,
          8,8,8,6,6,2,1,5,8,-1,
          7,7,-1,8,8];
        var idxRainbow,flagAll,colorUsed;
        idxRainbow = ~~(objCurStage.begin/100);
        flagAll = (~~(objCurStage.begin/50))%2;
        if(idxRainbow >= arrRainbow.length) {
          idxRainbow = arrRainbow.length - 1;
        }
        colorUsed = arrRainbow[idxRainbow];
        for(var x=0; x<stack.width; x+=(flagAll===1?1:(stack.width-1))) {
          if(colorUsed===-1) {
            arrRow[x]=~~(rng.next()*8+1);
          } else {
            arrRow[x]=colorUsed;
          }
        }

        objCurStage.gen(arrRow);
        stack.rowRise(arrRow, piece);
        frameLastRise=frame;
        sound.playse("garbage");
      }
    }else if(gametype===7) { //dig zen
      for(;lastPiecesSet<piecesSet;lastPiecesSet++){
        digZenBuffer++;
        var piecePerRise=[
          8,6.5,4,3.5,10/3,
          3,2.8,2.6,2.4,2.2,
          2][level>10?10:level];
        if(digZenBuffer-piecePerRise > -0.000000001){
          digZenBuffer-=piecePerRise;
          if(Math.abs(digZenBuffer) < 0.000000001){
            digZenBuffer = 0;
          }
          var arrRow=[8,8,8,8,8,8,8,8,8,8];
          arrRow[~~(rng.next()*10)]=0;

          stack.rowRise(arrRow, piece);
          sound.playse("garbage");
        }
      }
    }
  } while(false) // break when game over

  updateScoreTime();
}

var inloop = false; //debug
function gameLoop() {

  //if (frame % 60 == 0) console.log("running");
  var fps=60;

  if (isGameRunning()) {
    requestAnimFrame(gameLoop);

    // anti turbulance
    // requestanimationframe is not perfectly 60fps, also with turbulance
    var repeat = (Date.now() - startTime - pauseTime)/1000*fps - frame;
    if (repeat>=2) {
      repeat = Math.floor(repeat);
      frameSkipped += repeat-1;
    } else if (repeat <= 0) {
      repeat = Math.ceil(repeat);
      frameSkipped += repeat-1;
    } else {
      repeat = 1;
    }
    
    // merge key status from various sources
    

    for (var repf=0;repf<repeat;repf++,frame++) {
      if (!watchingReplay) {
        keysDown = keysDownTouch | keysDownKeyboard;
        if(lastKeys !== keysDown){
          replay.keys[frame] = keysDown;
        }
      } else if (frame in replay.keys) {
        keysDown = replay.keys[frame];
      }
      keysPushing = keysDown & ~lastKeys;
      keysPopping = ~keysDown & lastKeys;

      if (gameState === 0) {
        // Playing

          update();

      } else if (gameState === 2 || gameState === 4) {

        // DAS Preload
        if (keysDown & flags.moveLeft) {
          piece.shiftDelay = settings.DAS;
          piece.shiftReleased = false;
          piece.shiftDir = -1;
        } else if (keysDown & flags.moveRight) {
          piece.shiftDelay = settings.DAS;
          piece.shiftReleased = false;
          piece.shiftDir = 1;
        } else {
          piece.shiftDelay = 0;
          piece.shiftReleased = true;
          piece.shiftDir = 0;
        }
        if (!gameparams.noRotation) {
          if (flags.rotLeft & keysPushing) {
            piece.irsDir = -1;
            piece.finesse++;
          } else if (flags.rotRight & keysPushing) {
            piece.irsDir = 1;
            piece.finesse++;
          } else if (flags.rot180 & keysPushing) {
            piece.irsDir = 2;
            piece.finesse++;
          }
        }
        if (flags.holdPiece & keysPushing) {
          if (gametype === 1 && gameparams.marathonType === 1){
          } else {
            piece.ihs = true;
            //console.log("IHS");
          }
        }
        // lastkeys not used from here
        if (gameState === 2) {
          // Count Down
          if (frame === 0) {
            $setText(msg,'各就各位\nREADY');
            sound.playse("ready");
          } else if (frame === ~~(fps*5/6)) {
            $setText(msg,'走着~\nGO!');
            sound.playse("go");
          } else if (frame === ~~(fps*10/6)) {
            $setText(msg,'');
            scoreStartTime = Date.now();
          }
          scoreTime = 0;
        } else {
          // are
          piece.are++;
          updateScoreTime();
        }
        if (
          (gameState === 2 && frame >= fps*10/6) ||
          (gameState === 4 && piece.are >= piece.areLimit)
        ) {
          gameState = 0;
          // console.time("123");
          if (piece.ihs) {
            piece.index = preview.next();
            piece.hold();
          } else {
            piece.new(preview.next());
          }
          piece.draw();
          // console.timeEnd("123");
          // console.log(frame);
          updateScoreTime();
        }

      } else if (gameState === 9 || gameState === 1) {
        if (stack.toGreyRow >= stack.hiddenHeight) {
          /**
           * Fade to grey animation played when player loses.
           */
          if (frame % 2) {
            for (var x = 0; x < stack.width; x++) {
               /* farter */ //WTF gamestate-1
              if (stack.grid[x][stack.toGreyRow])
                stack.grid[x][stack.toGreyRow] =
                  (gameState === 9 ? 8 : 0);
            }
            stack.dirty = true;
            stack.toGreyRow--;
          }
        } else {
          //clear(activeCtx);
          //piece.dead = true;
          trysubmitscore();
          gameState = 3;
          touchButtonsToggle();
        }
      }
      // also processes in winning/losing animation. for simplicity.
      if (lastKeys !== keysDown) {
        lastKeys = keysDown;
      }
    }
    
    statistics();
    
    // TODO improve this with 'dirty' flags.
    /* farter */ // as you draw for lock delay brightness gradient... give this up..

    if (piece.x !== lastX ||
    Math.floor(piece.y) !== lastY ||
    piece.pos !== lastPos ||
    piece.lockDelay !== lastLockDelay ||
    piece.dirty) {
      piece.draw();
    }
    lastX = piece.x;
    lastY = Math.floor(piece.y);
    lastPos = piece.pos;
    lastLockDelay = piece.lockDelay;
    piece.dirty = false;
    
    if (stack.dirty) {
      stack.draw();
    }
    if (preview.dirty) {
      preview.draw();
    }
    
  } else {
    console.log("stop inloop",inloop)
    inloop = false;
  }
}

// called after piece lock, may be called multple times when die-in-one-frame
function checkWin(){
  var isend=false;
  if (gametype === 1) { // Marathon
    if (settings.Gravity !== 0 && lines>=200) { // not Auto, limit to 200 Lines
      isend=true;
    }
  } else if (gametype === 5) { // Score Attack
    if (lines>=lineLimit) { // not Auto, limit to 200 Lines
      isend=true;
    }
  } else if (gametype === 4) { // Dig race
    if (digLines.length === 0) {
      isend=true;
    }
  } else if (gametype === 6) { // 20G
    if (lines>=300) { // 200 + 100
      isend=true;
    }
  } else if (gametype === 7) { // dig zen
    if (lines>=400) { // 300 + 100
      isend=true;
    }
  } else if (gametype === 0) { // misc line limited modes
    if (lines>=lineLimit) {
      isend=true;
    }
  }
  if (gameparams.symmetry === 1){ // you must end symmetrically
    var halfwidth = Math.ceil(stack.width / 2);
    outer:
    for (var x = 0; x < halfwidth; x++) {
      var symmx = stack.width - 1 - x;
      for (var y = 0; y < stack.height; y++) {
        var c = stack.grid[x][y], symmc = stack.grid[symmx][y];
        var nc = +(c !== void 0) + +(symmc !== void 0)
        if (nc == 1) {
          //console.log("not balanced", x, symmx, y);
          isend = false;
          break outer;
        }
        if (nc == 2 && !Stack.isMinoSymmetric(c, symmc)){
          //console.log("not symmetric", x, symmx, y);
          isend = false;
          break outer;
        }
      }
    }
    if(isend){
      stack.toGreyRow = 0; // that's also some art
    }
  }
  if(isend){
    if (gametype === 0 && lineLimit === 40){
      if (gameparams.backFire || gameparams.symmetry){
        $setText(msg, 'GREAT!');
      } else {
        var rank = null;
        var time = (Date.now() - scoreStartTime - pauseTime) / 1000;
        for (var i in sprintRanks) {
          if (time > sprintRanks[i].t) {
            rank = sprintRanks[i];
            break;
          }
        }
        msg.innerHTML = rank.u + "<br /><small>" + rank.b +"</small>";
      }
    } else {
      $setText(msg, 'GREAT!');
    }
    gameState = 1;
    
    piece.dead = true;
    menu(3);
    sound.playse("endingstart");
  }
}

var playername=void 0;

function requireplayername(){
  if(playername===void 0)
    playername=prompt("Enter your name for leaderboard\n('cancel' = anonymous):\n请输入上榜大名：","");
  if(playername===null)
    playername="anonymous";
  if(playername==="")
    playername="unnamed";
}

function trysubmitscore() {
  if(watchingReplay)
    return;
  if(gametype===4 && gameparams.digraceType==="map")
    void 0;//return;
  var obj={req:"ranking"};
  var time = scoreTime;
  if(timePenalty){
    time+=1000*timePenalty;
  }

  if(gametype===0) // 40L
    obj.mode="sprint" + 
      (gameparams.lineLimit?""+gameparams.lineLimit:"") +
      (gameparams.widthLimit?("width"+gameparams.widthLimit):"") +
      (gameparams.pieceSet?["","noi","alli"][gameparams.pieceSet]:"") +
      (gameparams.backFire?["","bf1","bf2","bf3","bf4"][gameparams.backFire]:"")+
      (gameparams.delType?["","whole"][gameparams.delType]:"")+
      (gameparams.triplet?["","triplet"][gameparams.triplet]:"")+
      (gameparams.symmetry?["","symmetry"][gameparams.symmetry]:"")+
      (gameparams.noRotation?["","norot"][gameparams.noRotation]:"")+
      (gameparams.validPos?["","posup","posflat"][gameparams.validPos]:"")+
      (gameparams.fallMode?["","nofall"][gameparams.fallMode]:"")+
      (gameparams.isolation?["","iso","isoboth"][gameparams.isolation]:"")+
      (gameparams.tfmStackEachPiece?["","epflipx","epflipy","eprot180"][gameparams.tfmStackEachPiece]:"");
  else if(gametype===3) // dig
    obj.mode="dig" + (gameparams.digOffset?gameparams.digOffset:"");
  else if(gametype===4) // dig race
    obj.mode="digrace" +
      (gameparams.digraceType?gameparams.digraceType:"checker") +
      (gameparams.triplet?["","triplet"][gameparams.triplet]:"")+
      (gameparams.symmetry?["","symmetry"][gameparams.symmetry]:"");
  else if(gametype===1) // marathon
    obj.mode="marathon" + (gameparams.marathonType?["","cls"][gameparams.marathonType]:"");
  else if(gametype===5) // score attack
    obj.mode="score";
  else if(gametype===6) // 20g
    obj.mode="marathon20g";
  else if(gametype===7) // dig zen
    obj.mode="digzen";
  else
    return;

  if(
    (gametype===0 && gameState===1)||
    (gametype===3 && gameState===9)||
    (gametype===4 && gameState===1)||
    (gametype===1 && settings.Gravity === 0)||
    (gametype===5)||
    (gametype===6)||
    (gametype===7)||
    (gametype===0 && (gameparams.symmetry || gameparams.noRotation))||
    false
  ){
    requireplayername();
    obj.lines=lines;
    obj.time=time;
    obj.score=score.toString();
    obj.name=playername;
    obj.replay=curreplaydata();

    submitscore(obj);
  }else{
    submitscore(obj);
  }
}

function tryreplaydata() {
/*
  var strreplay = prompt("Paste replay data here: 在此贴入录像数据：");
  if (strreplay === null)
    return;
*/
  var strreplay = replaydata.value;
  init('replay',strreplay);
}

function showreplaydata(strreplay) {
  /*
  var objblob = new Blob([strreplay],{type:"text/plain"});
  var url=URL.createObjectURL(objblob);
  window.open(url);
  */
  replaydata.value = strreplay;
  replaydata.select();
  menu(6,1);
}

function curreplaydata() {
  //var strreplay = Compress(JSON.stringify(replay));
  var objKeys = replay.keys;
  replay.keys = keysEncode(replay.keys);
  var strreplay = JSON.stringify(replay);
  replay.keys = objKeys;
  //strreplay = strreplay + Compress(strreplay);
  return strreplay;
}