function Piece() {
  this.x;
  this.y;
  this.pos = 0;
  this.tetro;
  this.index;
  this.gravity = gravityUnit;
  this.softDrop = gravityUnit;
  this.lockDelay = 0;
  this.lockDelayLimit = 30;
  this.lockType = 0; // 1: harddroped, 2: distant harddrop
  this.are = 0;
  this.areLimit = 0;
  this.irsDir = 0;
  this.ihs = false;
  this.shiftDelay = 0;
  this.shiftDir = 0;
  this.shiftReleased = false; // "(some first) shift want to be triggered"
   // attempted to move, but failed. cleared when corresponding move button up. rotsys's that consumes blockedness?
   // count into dirty // doesn't count when in ARE
  this.blockedDir = 0;
  this.arrDelay = 0;
  this.held = false;
  this.landed = false;
  this.finesse = 0;
  this.dirty = false;
  this.dead = true;
}
/**
 * Removes last active piece, and gets the next active piece from the grab bag.
 */
Piece.prototype.new = function(index) {
  // TODO if no arguments, get next grabbag piece
  //console.log("new irs"+this.irsDir+", ihs"+this.ihs);
  var initinfo = RotSys[settings.RotSys].initinfo[index];
  this.pos = initinfo[2];
  this.x = ~~((stack.width - 4) / 2) + initinfo[0];
  this.y = stack.hiddenHeight - 2 + initinfo[1];
  this.index = index;
  this.tetro = [];
  this.held = false;
  this.lockType = 0;
  this.ihs = false;
  this.finesse = 0;
  this.softDrop = gravityArr[settings.SoftDrop];
  this.dirty = true;
  this.dead = false;

  // TODO Do this better. Make clone object func maybe.
  //for property in pieces, this.prop = piece.prop
  if (this.irsDir !== 0) {
    var curPos = this.pos;
    var newPos = (this.pos+this.irsDir).mod(4);
    var offset = RotSys[settings.RotSys].offset[this.index];
    var offsetX = offset[newPos][0] - offset[curPos][0];
    var offsetY = offset[newPos][1] - offset[curPos][1];
    this.tetro = pieces[index].tetro[newPos];
    if (!this.moveValid(offsetX, offsetY, this.tetro)) {
      this.tetro = pieces[index].tetro[curPos];
    } else {
      this.x += offsetX;
      this.y += offsetY;
      this.pos = newPos;
    }
    this.irsDir = 0;
  } else {
    this.tetro = pieces[index].tetro[this.pos];
  }

  this.lockDelayLimit = settings.LockDelay;
  if (gametype === 6) { //Death
    this.gravity = Infinity;
    if (level < 20) {
      this.lockDelayLimit = [
        30, 25, 22, 20, 20, 18, 17, 17, 15, 15,
        13, 13, 13, 13, 13, 12, 12, 12, 11, 11
      ][level];
    } else {
      this.lockDelayLimit = 11;
    }
  } else if (gametype === 1) { //Marathon
    if (gameparams.marathonType === 1) {
      this.gravity = (level * 2 + 10) / 60;
      this.lockDelayLimit = 8;
    } else {
      if (level < 20) {
        this.gravity = [
          1/60, 1/30, 1/25, 1/20, 1/15, 1/12, 1/10, 1/8,  1/6,  1/6,
           1/4,  1/4,  1/3,  1/3,  1/3,  1/2,    1,   1,    2,    3
          ]
          [level];
      } else {
         this.gravity = Infinity;
         this.lockDelayLimit = ~~(30 * Math.pow(0.93, (Math.pow(level-20, 0.8)))); // magic!
      }
    }
  } else if (settings.Gravity !== 0) {
    this.gravity = gravityArr[settings.Gravity - 1];
  } else {
    this.gravity = gravityUnit;
  }
  if (gametype === 0){
    if(this.lockDelayLimit < 8) {
      this.lockDelayLimit = 8;
    }
  }
  
  // Check for blockout.
  if (!this.moveValid(0, 0, this.tetro)) {
    //this.dead = true; //show it?
    gameState = 9;
    $setText(msg,'BLOCK OUT!');
    menu(3);
    sound.playse("gameover");
    return;
  }
  
  //real 20G
  this.checkInfGravity();
  this.landed = !this.moveValid(0, 1, this.tetro);
  
  // die-in-one-frame!
  if(this.landed && (this.lockDelay >= this.lockDelayLimit)) {
    this.checkLock();
  }
}
Piece.prototype.tryKickList = function(kickList, rotated, newPos, offsetX, offsetY, dxMult) {
  for (var k = 0; k < kickList.length; k++) {
    if (this.moveValid(
      offsetX + kickList[k][0] * dxMult,
      offsetY + kickList[k][1],
      rotated
    )) {
      this.x += offsetX + kickList[k][0] * dxMult;
      this.y += offsetY + kickList[k][1];
      this.tetro = rotated;
      this.pos = newPos;
      this.finesse++;
      sound.playse("rotate");
      this.blockedDir = 0; // check when next time shift
      return true;
    }
  }
  return false;
}
Piece.prototype.rotate = function(direction) {
  if(this.blockedDir !== 0 || settings.DASCut === setting.DASCut.length-1) {
    this.checkDasCut(true);
  }
  // Goes thorugh kick data until it finds a valid move.
  var curPos = this.pos.mod(4);
  var newPos = (this.pos + direction).mod(4);
  // Rotates tetromino.
  var rotated = pieces[this.index].tetro[newPos];
  var offset = RotSys[settings.RotSys].offset[this.index];
  var offsetX = offset[newPos][0] - offset[curPos][0];
  var offsetY = offset[newPos][1] - offset[curPos][1];
  var dxMult = 1;
  if (settings.RotSys === 2 || settings.RotSys === 14) { //ARS, Plus
    var kickList = [];
    if (this.index === PieceI.index) {
      if(curPos === 1 || curPos === 3)
        kickList = [[ 0, 0],[+1, 0],[-1, 0],[+2, 0]];
      else
        kickList = [[ 0, 0],[ 0,-1],[ 0,-2]];
    } else {
      if (newPos === 0 ||
        ((this.index === PieceS.index || this.index === PieceZ.index) && newPos === 2)
      )
        kickList = [[ 0, 0],[+1, 0],[-1, 0],[ 0,-1]];
      else
        kickList = [[ 0, 0],[+1, 0],[-1, 0]];
      dxMult = direction === 2 ? 1 : direction;
    }
    this.tryKickList(kickList, rotated, newPos, offsetX, offsetY, dxMult);
  } else {
    var kickIndex = [ 1, -1 ,2].indexOf(direction); // kickDataDirectionIndex
    var kickList;
    if(settings.RotSys === 0 || settings.RotSys === 12 || settings.RotSys === 56) //jj,quadrabreak
      kickList = WKTableSRS[this.index][kickIndex][curPos];
    else if (settings.RotSys === 1)
      kickList = WKTableCultris;
    else if (settings.RotSys === 15 || settings.RotSys === 40) // dx superlite
      kickList = WKTableDX[kickIndex][curPos]
    else if (settings.RotSys === 28) // BPS2 for true man
      kickList = [[0, 0]];
    else if (settings.RotSys === 46) // Tris the battle
      kickList = WKTableTheBattle;
    else if (settings.RotSys === 49 || settings.RotSys === 50) { // T-EX!
      // T-EX intra-frame processing order: shift-rotate-fall
      var blockedDir = this.blockedDir;
      if(direction === 2) { // inaccurate cus T-EX doesn't have rot180
        kickList = WKTableEX_N;
        dxMult = blockedDir || 1;
      } else {
        kickIndex = blockedDir * direction + 1;
        kickList = WKTableEX[kickIndex];
        dxMult = direction;
        // console.log(kickIndex, kickList);
      }
    } else
      kickList = WKTableDTET[kickIndex]; // inaccurate cus DTET doesn't have 180
    this.tryKickList(kickList, rotated, newPos, offsetX, offsetY, dxMult);
  }
}
Piece.prototype.checkDasCut = function(isRotate) {
  if (this.shiftDir !== 0) {
    if(!isRotate) {
      this.arrDelay = 0; // anti-slidiness // THE actual upgrade from 0.68
    }
    var dascut = settings.DASCut || 0; //0=synchro
    if (dascut === setting.DASCut.length-1) {
      dascut = Infinity;
    }
    if(!isRotate) { // for rotate, keep dascut==0 synchro
      dascut = Math.max(dascut, settings.ARR - 1);
    }
    this.shiftDelay = Math.min(this.shiftDelay, settings.DAS - dascut); // may be <0!
  }
}
Piece.prototype.checkShiftInARE = function() {
  // Shift key pressed event.
  if (keysPushing & flags.moveLeft) {
    this.shiftDelay = 0;
    this.arrDelay = 0;
    this.shiftReleased = true;
    this.shiftDir = -1;
    this.finesse++;
  } else if (keysPushing & flags.moveRight) {
    this.shiftDelay = 0;
    this.arrDelay = 0;
    this.shiftReleased = true;
    this.shiftDir = 1;
    this.finesse++;
  }
    // Shift key released event.
  if (this.shiftDir === 1 && keysPopping & flags.moveRight && keysDown & flags.moveLeft) {
    this.shiftDelay = 0;
    this.arrDelay = 0;
    this.shiftReleased = true;
    this.shiftDir = -1;
    this.blockedDir = 0;
  } else if (this.shiftDir === -1 && keysPopping & flags.moveLeft && keysDown & flags.moveRight) {
    this.shiftDelay = 0;
    this.arrDelay = 0;
    this.shiftReleased = true;
    this.shiftDir = 1;
    this.blockedDir = 0;
  } else if (keysPopping & flags.moveRight && keysDown & flags.moveLeft) {
    this.shiftDir = -1;
  } else if (keysPopping & flags.moveLeft && keysDown & flags.moveRight) {
    this.shiftDir = 1;
  } else if ((keysPopping & flags.moveLeft) || (keysPopping & flags.moveRight)) {
    this.shiftDelay = 0;
    this.arrDelay = 0;
    this.shiftReleased = true;
    this.shiftDir = 0;
    this.blockedDir = 0;
  }
  if (this.shiftDir) {
    if (this.shiftReleased && settings.DAS !== 0) {
      this.shiftReleased = false;
      this.shiftDelay++;
    } else if (this.shiftDelay < settings.DAS) {
      this.shiftDelay++;
    } else if (this.shiftDelay < Infinity && this.shiftDelay >= settings.DAS) {
      // do nothing
    }
  }
}
Piece.prototype.checkShift = function() {
  // Shift key pressed event.
  if (keysPushing & flags.moveLeft) {
    this.shiftDelay = 0;
    this.arrDelay = 0;
    this.shiftReleased = true;
    this.shiftDir = -1;
    this.finesse++;
  } else if (keysPushing & flags.moveRight) {
    this.shiftDelay = 0;
    this.arrDelay = 0;
    this.shiftReleased = true;
    this.shiftDir = 1;
    this.finesse++;
  }
  // Shift key released event.
  if (this.shiftDir === 1 && keysPopping & flags.moveRight && keysDown & flags.moveLeft) {
    this.shiftDelay = 0;
    this.arrDelay = 0;
    this.shiftReleased = true;
    this.shiftDir = -1;
    this.blockedDir = 0;
  } else if (this.shiftDir === -1 && keysPopping & flags.moveLeft && keysDown & flags.moveRight) {
    this.shiftDelay = 0;
    this.arrDelay = 0;
    this.shiftReleased = true;
    this.shiftDir = 1;
    this.blockedDir = 0;
  } else if (keysPopping & flags.moveRight && keysDown & flags.moveLeft) {
    this.shiftDir = -1;
  } else if (keysPopping & flags.moveLeft && keysDown & flags.moveRight) {
    this.shiftDir = 1;
  } else if ((keysPopping & flags.moveLeft) || (keysPopping & flags.moveRight)) {
    this.shiftDelay = 0;
    this.arrDelay = 0;
    this.shiftReleased = true;
    this.shiftDir = 0;
    this.blockedDir = 0;
  }
  // Handle events
  var dascut = settings.DASCut || 0; //0=synchro
  //if (dascut) {
  //  this.ShiftDir = 0;
  //  console.log("interrupt")
  //}
  if (this.shiftDir) {
    // first "shift" intent is not buffered, but autorepeat ones are buffered
    // 1. When key pressed instantly move over once.
    if (this.shiftReleased && settings.DAS !== 0) {
      this.shift(this.shiftDir); // might be blocked! then enters the next state but still trying
      this.shiftReleased = false;
      this.shiftDelay++;
    // 2. Apply DAS delay
    } else if (this.shiftDelay < settings.DAS) {
      this.shiftDelay++;
    // 3. Once the delay is complete, move over once.
    //     set shiftDelay to Infinity so this doesn't run again.
    //     will work with variable DAS.
    // if das=0, first keydown (and unfrozen move key) enter here directly
    // if arr=0, repeat here, never entering phase 4
    // but if forever dascut, let shiftdelay == -inf and lock at phase 2
    } else if (this.shiftDelay < Infinity && this.shiftDelay >= settings.DAS) {
      if(this.shift(this.shiftDir)) {
        if (settings.ARR !== 0) this.shiftDelay = Infinity; // enter phase 4
      } else {
        // if blocked, enter phase 4 in "blocked" state, for simplicity, but only when arr!=0
        if (settings.ARR !== 0) {
          this.shiftDelay = Infinity;
          this.arrDelay = settings.ARR;
        }
      }
      if(dascut === setting.DASCut.length-1 && settings.ARR === 0) {
         // forever cut, special one-shot das
         // for finite cut: returns into pre-arr phase, more done at other places
        this.shiftDelay = -Infinity;
      }
    // 4. Apply ARR delay
    } else {
      this.arrDelay++;
    // 5. If ARR Delay is full, move piece, and reset delay and repeat.
      if (this.arrDelay >= settings.ARR && settings.ARR !== 0) {
        if(this.shift(this.shiftDir)) {
          this.arrDelay = 0;
        }
      }
    }
  }
  if (flags.moveLeft3 & keysPushing) {
    this.multiShift(-1, 3);
    this.finesse++;
  } else if (flags.moveRight3 & keysPushing) {
    this.multiShift(1, 3);
    this.finesse++;
  }
}
Piece.prototype.shift = function(direction) {
  var shifted = false;
  if (settings.ARR === 0 && this.shiftDelay >= settings.DAS) {
    while (true) {
      if (this.moveValid(direction, 0, this.tetro)) {
        this.x += direction;
        shifted = true;
        this.checkInfGravity();
      } else {
        break;
      }
    }
  } else if (this.moveValid(direction, 0, this.tetro)) {
    this.x += direction;
    shifted = true;
  }
  if (shifted) {
    this.arrDelay = 0;
    if(settings.ARR === 0 && this.shiftDelay >= settings.DAS) {
      this.blockedDir = direction;
    } else {
      this.blockedDir = 0;
    }
    sound.playse("move");
    return true;
  } else {
    // preserve arrDelay
    this.blockedDir = direction;
    return false;
  }
}
Piece.prototype.multiShift = function(direction, count) {
  var shifted = false;
  for (var i = 0; i < count && this.moveValid(direction, 0, this.tetro); ++i) {
    this.x += direction;
    shifted = true;
    this.checkInfGravity();
  }
  if(shifted){
    sound.playse("move");
  }
  // no handling about blocked or not and shiftDir?
}
Piece.prototype.shiftDown = function() {
  if (this.moveValid(0, 1, this.tetro)) {
    var grav = this.softDrop;
    if (grav > 1)
      this.y += this.getDrop(grav);
    else
      this.y += grav;
  }
}
Piece.prototype.hardDrop = function() {
  var distance = this.getDrop(Infinity);
  //console.log(distance);
  this.y += distance;
  score = score.add(bigInt(distance + this.lockDelayLimit - this.lockDelay));
  //statisticsStack();
  this.lockDelay = this.lockDelayLimit;
  this.lockType = distance > 0 ? 2 : 1;
}
Piece.prototype.getDrop = function(distance) {
  // causes lockdelay reset
  // assume the piece is at a valid position
  //if (!this.moveValid(0, 0, this.tetro))
    //return 0;
  for (var i = 1; i <= distance; i++) {
    if (!this.moveValid(0, i, this.tetro))
      return i - 1;
  }
  return i - 1;
}
Piece.prototype.hold = function() {
  if (gameparams.oneNext === 1){
    return;
  }
  var temp = hold.piece;
  if (!this.held) {
    if (hold.piece !== void 0) {
      hold.piece = this.index;
      this.new(temp);
    } else {
      hold.piece = this.index;
      this.new(preview.next());
    }
    this.held = true;
    hold.draw();
    sound.playse("hold");
  }
}
/**
 * Checks if position and orientation passed is valid.
 *  We call it for every action instead of only once a frame in case one
 *  of the actions is still valid, we don't want to block it.
 */
Piece.prototype.moveValid = function(cx, cy, tetro) {
  cx = cx + this.x;
  cy = Math.floor(cy + this.y);

  for (var x = 0; x < tetro.length; x++) {
    for (var y = 0; y < tetro[x].length; y++) {
      if (tetro[x][y] && (
        (cx + x < 0 || cx + x >= stack.width || cy + y >= stack.height) ||
        (cy + y >=0 && stack.grid[cx + x][cy + y])
      )) {
        return false;
      }
    }
  }
  this.lockDelay = 0;
  return true;
}

Piece.prototype.checkFall = function() {
  var grav = this.gravity;
  if (grav > 1)
    this.y += this.getDrop(grav);
  else {
    this.y += grav;
  }
  /* farter */ // rounding problem
  if (Math.abs(this.y - Math.round(this.y))<0.000001)
    this.y = Math.round(this.y);
}

Piece.prototype.checkInfGravity = function() {
  if(
    this.gravity === Infinity ||
    ((flags.moveDown & keysDown) && this.softDrop === Infinity)
  ){
      this.y += this.getDrop(Infinity);
  }
}

Piece.prototype.checkLock = function() {
  if (this.landed) {
    this.y = Math.floor(this.y); //@sega
    if (this.lockDelay >= this.lockDelayLimit) {
      this.dead = true;
      stack.addPiece(this);
      if(this.lockType > 0){
        sound.playse("harddrop");
      }else{
        sound.playse("lock");
      }
      this.dirty = true;
      
      this.blockedDir = 0; // reset // shift key in ARE doesn't count as blocked
      this.checkDasCut();
      
      if(gameState === 9){ // lockout! don't spawn next piece
        return;
      }else{
        this.held = false;
        /* farter */
        // Win?
        checkWin();
        if (gameState === 0 && piece.dead) { // still playing, then spawn the next piece
          // determine next ARE limit
          if (gametype === 6) { //Death
            if (level < 20) {
              this.areLimit = [
                18, 18, 18, 15, 15, 12, 12, 12, 12, 12,
                12, 12, 10, 10, 10,  8,  8,  8,  8,  8
              ][level];
            } else {
              this.lockDelayLimit = 11;
              this.areLimit = 6;
            }
          } else if (gametype === 1 && gameparams.marathonType === 1) {
            this.areLimit = 11;
          } else {
            this.areLimit = settings.AREDelay || 0;
          }
          if (this.areLimit === 0) { // IRS IHS not possible
            this.new(preview.next()); // may die-in-one-frame
          } else {
            gameState = 4;
            this.are = 0;
          }
        }
      }
      /* farter */
    }
  }
}

Piece.prototype.update = function() {
  if (this.moveValid(0, 1, this.tetro)) {
    this.checkFall();
  }
  this.landed = !this.moveValid(0, 1, this.tetro);
  this.checkLock();
}

Piece.prototype.draw = function() {
  clear(activeCtx);
  if (!this.dead) {
    var blockedDir=0; // slight offset
    if (RotSys[settings.RotSys].moveThenRot) { // temporary.. maybe another setting?
      blockedDir = this.blockedDir;
    }
    this.drawGhost(blockedDir);
    if (settings.Ghost !== 3) {
      var a = void 0;
      if (this.landed) {
        a = this.lockDelay / this.lockDelayLimit;
        if (this.lockDelayLimit === 0)
          a = 0;
        a = Math.pow(a,2)*0.5;
      }
      draw(
        this.tetro, this.x, Math.floor(this.y) - stack.hiddenHeight,
        activeCtx, RotSys[settings.RotSys].color[this.index], a, blockedDir
      );
    }
  }
}

Piece.prototype.drawGhost = function(blockedDir) {
  activeCtx.globalAlpha = 0.4;
  if (!this.landed) {
    var color = 0;
    if (settings.Ghost === 0 || settings.Ghost === 1) {
      if (settings.Ghost === 1) {
        color = RotSys[settings.RotSys].color[this.index];
      }
      draw(
        this.tetro, this.x, Math.floor(this.y + this.getDrop(Infinity)) - stack.hiddenHeight,
        activeCtx, color, 0, blockedDir
      );
    }
  }
  activeCtx.globalAlpha = 1;
}

var piece = new Piece();
