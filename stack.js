function Stack() {
  //this.grid;
}
/**
 * Creates a matrix for the playfield.
 */
Stack.prototype.new = function(x, y, hy) {
  var cells = new Array(x);
  for (var i = 0; i < x; i++) {
    cells[i] = new Array(hy + y);
  }
  this.width = x;
  this.height = hy + y;
  this.hiddenHeight = hy;
  this.toGreyRow = this.height - 1;
  this.grid = cells;
  
  this.dirty = true;
  this.statisticsDirty = true;
  
  var newRow = this.newRow();
  for(var i = 0; i < this.width; i++) {
    for(var j = 0; j < this.height; j++) {
      this.grid[i][j] = newRow[i];
    }
  }
}
/**
 * new "empty" row with widthLimit
 */
Stack.prototype.newRow = function() {
  var row = [];
  var wallLeft = 0, wallRight = this.width;
  if (gameparams.widthLimit >= 4 && gameparams.widthLimit < this.width) {
    // todo: for 3-right initial positions, should round up
    wallLeft = (this.width - gameparams.widthLimit) >> 1;
    wallRight = wallLeft + gameparams.widthLimit;
  }
  for (var i = 0; i < this.width; i++) {
    row.push((wallLeft <= i && i < wallRight) ? void 0 : 8);
  }
  return row;
}
/**
 * Adds tetro to the stack, and clears lines if they fill up.
 */
Stack.prototype.addPiece = function(piece) {
  var tetro = piece.tetro;
  var rect = pieces[piece.index].rect[piece.pos];
  var lineClear = 0;
  var isSpin = false;
  var once = false;
  var piecesDel = 0; // for whole/symmetry
  
  var bottomRow = []; // for backfire
  for (var x = 0; x < this.width; x++) {
    bottomRow.push(this.grid[x][this.height - 1]);
  }

  // spin check
  if (
    !piece.moveValid(-1, 0, piece.tetro) &&
    !piece.moveValid( 1, 0, piece.tetro) &&
    !piece.moveValid( 0,-1, piece.tetro)
  ) {
    isSpin = true;
  }
  
  do { // for gameover breaking
    // for symmetric
    var cellToDelWhole = [];
    // Add the piece to the stack.
    var valid = false;
    
    var doAddPiece = true;
    if (gameparams.validPos === 1) { // fixed lite, only allow flat up-facing pose
      if (!(piece.index === PieceO.index || piece.pos === 0 || (piece.pos === 2 && (
        [PieceI.index, PieceS.index, PieceZ.index].indexOf(piece.index) !== -1
      )))){
        doAddPiece = false;
      }
    } else if (gameparams.validPos === 2) { // just flat pose
      if (!(piece.index === PieceO.index || piece.pos === 0 || piece.pos === 2)){
        doAddPiece = false;
      }
    }
    if (!doAddPiece) {
      timePenalty += 10;
      if (timePenalty >= 100) {
        gameState = 9;
        $setText(msg,'RUUAAHHHH!');
        menu(3);
        sound.playse("gameover");
        break;
      }
    }
    
    for (var tx = 0; tx < tetro.length; tx++) {
      for (var ty = 0; ty < tetro[tx].length; ty++) {
        var x = tx + piece.x, y = ty + piece.y;
        if (tetro[tx][ty] && y >= 0) {
          if (doAddPiece) {
            this.grid[x][y] =
              RotSys[settings.RotSys].color[piece.index] |
              (cellFlags.maskConn & tetro[tx][ty]) |
              ((piece.index + 1) << cellFlags.heightIndex);
          }
          if (gameparams.symmetry === 1) {
            // mark pieces violating symmetry constraint, delete later
            // must delete after completely added, because it may be itself!
            var symmx = this.width - 1 - x;
            var c = this.grid[x][y];
            var symmc = this.grid[symmx][y];
            if (c !== void 0 && symmc !== void 0) { // in-game, pass if only one
              if (!Stack.isMinoSymmetric(c, symmc)){
                cellToDelWhole.push([symmx, y]);
              }
            }
          }
          if (gameparams.isolation) {
            // find piece of the same index nearby (but not myself), delete it
            for (var i = 0; i < 4; i++){
              var d = fourWays[i];
              var cx = x + d.dx, cy = y + d.dy;
              if (cx >= 0 && cx < this.width && cy >= 0 && cy < this.height) {
                if (!(this.grid[x][y] & d.connFlag) && this.grid[cx][cy] !== void 0 && (
                  ((this.grid[cx][cy] & cellFlags.maskIndex) >> cellFlags.heightIndex) === piece.index + 1
                )) {
                  cellToDelWhole.push([cx, cy]);
                  if (gameparams.isolation === 2) {
                    cellToDelWhole.push([x, y]);
                  }
                }
              }
            }
            
          }
          // Get column for finesse
          if (!once || x < column) {
            column = x;
            once = true;
          }
          // This checks if any cell is in the play field. If there
          //  isn't any this is called a lock out and the game ends.
          if (y >= this.hiddenHeight) {
            valid = true;
          }
        }
      }
    }
    
    if (gameparams.symmetry === 1 || gameparams.isolation) {
      for (var i = 0; i < cellToDelWhole.length; i++){
        var xy = cellToDelWhole[i];
        var x = xy[0], y = xy[1];
        piecesDel += this.delWholePieceAt(x, y);
      }
      if (piecesDel && !gameparams.isolation) { // isoltion mode, don't add penalty
        timePenalty += 10 * piecesDel;
        if (timePenalty >= 100) {
          gameState = 9;
          $setText(msg,'RUUAAHHHH!');
          menu(3);
          sound.playse("gameover");
          break; // may skip line clear, but don't care
        }
      }
    }

    // Lock out
    if (!valid) {
      gameState = 9;
      $setText(msg,'LOCK OUT!');
      menu(3);
      sound.playse("gameover");
      break;
    }

    var rowsDel = [];
    if (gameparams.triplet) {
      // triplet mode: delete only triplet lines
      var fullMask = 0, delMask = 0; // bit, max 31
      
      for (var y = 0; y < this.height; y++) {
        var count = 0;
        for (var x = 0; x < this.width; x++) {
          if (this.grid[x][y]) count++;
        }
        if (count === this.width) {
          fullMask |= (1 << y);
        }
      }
      for (var interval = 1; interval * 2 + 1 < this.height; interval++) {
        var triplets = fullMask & (fullMask << interval) & (fullMask << (interval * 2));
        delMask |= triplets | (triplets >> interval) | (triplets >> (interval * 2));
      }
      if(delMask)console.log(delMask);
      for (var y = 0; y < this.height; y++) {
        if (delMask & (1 << y)) {
          lineClear++;
          rowsDel.push(y);
        }
      }
    } else {
      // ordinary: Check modified lines for full lines.
      var yfrom = Math.max(0, piece.y + rect[1]);
      var yto = piece.y + rect[3];
      
      for (var row = yfrom; row < yto; row++) {
        var count = 0;
        for (var x = 0; x < this.width; x++) {
          if (this.grid[x][row]) count++;
        }
        // Clear the line. This basically just moves down the stack.
        // TODO Ponder during the day and see if there is a more elegant solution.
        if (count === this.width) {
          lineClear++; // NOTE stats
          rowsDel.push(row);
        }
      }
    }
    
    // Delete the lines
    for (var i = 0; i < rowsDel.length; i++) {
      var row = rowsDel[i];
      
      var rowInDig = digLines.indexOf(row);
      if (rowInDig !== -1) {
        for (var y = 0; y < rowInDig; y++) {
          digLines[y]++;
        }
        digLines.splice(rowInDig, 1);
      }
      
      if (gameparams.delType === 1){
        for (var x = 0; x < this.width; x++) {
          this.delWholePieceAt(x, row);
        }
      } else {
        for (var x = 0; x < this.width; x++) {
          this.grid[x][row] = void 0;
          if (row > 0 && this.grid[x][row - 1] !== void 0) {
            this.grid[x][row - 1] &= ~cellFlags.connDown;
          }
          if (row + 1 < this.height && this.grid[x][row + 1] !== void 0){
            this.grid[x][row + 1] &= ~cellFlags.connUp;
          }
        }
      }
      
      if (!gameparams.fallMode) { // 0 normal 1 none 2+ others
        var newRow = this.newRow();
        for (var y = row; y >= 0; y--) {
          for (var x = 0; x < this.width; x++) {
            this.grid[x][y] = y === 0 ? newRow[x] : this.grid[x][y - 1];
          }
        }
      } else if (gameparams.fallMode === 1) { // might be wall
        var newRow = this.newRow();
        for (var x = 0; x < this.width; x++) {
          this.grid[x][row] = newRow[x];
        }
      }
      
    }

    var scoreAdd = bigInt(level + 1);
    var garbage = 0;
    if (lineClear !== 0) {
      //console.log("C"+combo+" B"+b2b)
      if (isSpin) {
        scoreAdd = scoreAdd.mul(
          bigInt(400 + 400 * lineClear)
            .mul(bigInt(2).pow(b2b + combo))
        );
        garbage = ~~((2 + (lineClear + 3) * lineClear / 2) * (b2b == 0 ? 3 : 4) / 5);
        b2b += 1;
        sound.playse("tspin",Math.min(lineClear, 3));
      } else if (lineClear >= 4) {
        scoreAdd = scoreAdd.mul(
          bigInt(100 * (lineClear * lineClear / 4 + lineClear) - 25 * (lineClear & 1))
            .mul(bigInt(2).pow(b2b + combo))
        );
        garbage = ~~((lineClear * lineClear) * (b2b == 0 ? 4 : 5) / 16);
        b2b += 1;
        sound.playse("erase4");
      } else {
        scoreAdd = scoreAdd.mul(
          bigInt([100,300,500,800][lineClear - 1])
            .mul(bigInt(2).pow(combo))
        );
        b2b = 0;
        garbage = [0,1,2,4][lineClear - 1];
        sound.playse("erase",lineClear);
      }
      garbage += ~~(combo / 2); //[0,0,1,1,2,2,3,3,4,4,5,5,6,6,...]
      combo += 1;
    } else {
      if (isSpin) {
        scoreAdd = scoreAdd.mul(
          bigInt(2).pow(bigInt(b2b))
            .mul(bigInt(400))
        );
        sound.playse("tspin0");
      } else {
        scoreAdd = bigInt(0);
      }
      combo = 0;
    }
    lines += lineClear;
    if (gametype === 1 || gametype === 6) {
      level = ~~(lines / 10);
    } else if (gametype === 7) {
      level = ~~(lines / 30);
    }
    score = score.add(scoreAdd.mul(bigInt(16).pow(allclear)));
    
    var isPC = true;
    if (piecesDel !== 0 || !doAddPiece) { // self symmetry violation leads to fake PC
      isPC = false;
    }
    for (var x = 0; x < this.width; x++)
      for (var y = 0; y < this.height; y++)
        if (this.grid[x][y])
          isPC = false;
    if (isPC) {
      score = score.add(bigInt(1000000).mul(bigInt(16).pow(allclear)));
      allclear ++;
      sound.playse("bravo");
      garbage += 10;
    }
    
    if(gameparams.backFire){
      if(gameparams.backFire === 1){
        garbage = ~~(lineClear * 1.5 - 2);
      }else if(gameparams.backFire === 3){
        garbage *= ~~(lines/2);
      }else if(gameparams.backFire === 4){
        garbage = +(combo >= 2 || lineClear >= 2 || isSpin || isPC)
      }else if(gameparams.backFire === 5){
        garbage = lineClear===0?0:lineClear-1;
      }else if(gameparams.backFire === 6){
        garbage = (+(lineClear==01))*2;
      }
      if(garbage !== 0) {
        if(gameparams.backFire === 1){
          for(var y = 0; y < garbage; y++){
            this.rowRise(bottomRow, piece);
          }
        }else if([2,3].indexOf(gameparams.backFire)>=0){
          var hole = ~~(rng.next() * 10);
          var arrRow = [8,8,8,8,8,8,8,8,8,8];
          arrRow[hole] = 0;
          for(var y = 0; y < garbage; y++){
            this.rowRise(arrRow, piece);
          }
        }else if([5,6].indexOf(gameparams.backFire)>=0){
          for(var y = 0; y < garbage; y++){
            var hole = ~~(rng.next() * 10);
            var arrRow = [8,8,8,8,8,8,8,8,8,8];
            arrRow[hole] = 0;
            this.rowRise(arrRow, piece);
          }
        }else if(gameparams.backFire === 4){
          stack.makeSomeArt();
          if(isPC) {
            $setText(msg,'PAHUEKUTO KURIYAA!');
          } else if(isSpin) {
            $setText(msg,'SPINNING!');
          } else if(combo >= 2) {
            $setText(msg,'RAHH COMBO!');
          } else if(lineClear >= 2) {
            $setText(msg,['DOUBLE!','TRIPLE!','TETR.JS!'][lineClear - 2]);
          }
        }
      }
    }
    
    if(gameparams.tfmStackEachPiece===3){
      this.rotStack180();
    }
    
    //if (scoreAdd.cmp(0) > 0)
      //console.log(scoreAdd.toString());
  } while(false); // gameover break
  
  statsFinesse += piece.finesse - finesse[piece.index][piece.pos][column];
  piecesSet++; // NOTE Stats
  // TODO Might not need this (same for in init)
  column = 0;

  this.statisticsDirty = true;
  this.dirty = true;
}
/**
 * Raise a garbage line. farter
 */
Stack.prototype.rowRise = function(arrRow, objPiece) {
  var isEmpty = true;
  for(var x = 0; x < this.width; x++) {
    for(var y = 0; y < this.height - 1; y++) {
      this.grid[x][y] = this.grid[x][y+1];
    }
    if(arrRow[x])
      isEmpty = false;
    this.grid[x][this.height-1]=arrRow[x];
  }
  var topout = false;
  for(var y = 0; y < digLines.length; y++) {
    digLines[y]--;
    if(digLines[y] < 0) { // top out, but only detecting added lines
      topout = true;
    }
  }
  if(gameState !== 9 && topout) {
    gameState = 9;
    $setText(msg,'TOP OUT!');
    menu(3);
    sound.playse("gameover");
  }
  if(!isEmpty) {
    digLines.push(this.height - 1);
  }
  if (!piece.dead) {
    if (!piece.moveValid(0, 0, piece.tetro)) {
      piece.y-=1;
      if (piece.y + pieces[piece.index].rect[3] <= this.hiddenHeight - 2) {
        // the bottom is >=2 cell away from visible part
        if(gameState !== 9) { // may happen simutanously
          gameState = 9;
          $setText(msg,'RUUAAAAA!');
          menu(3);
          sound.playse("gameover");
        }
      }
    }
    piece.dirty = true;
  }
  this.dirty = true;
}
/**
 * Detele whole piece by flood fill according to mino connection flags.
 */
Stack.prototype.delWholePieceAt = function(x, y) {
  if (this.grid[x][y] === void 0){
    return 0;
  }
  var queue = [[x,y]], qh = 0;
  while (qh < queue.length){
    var cxy = queue[qh++];
    var cx = cxy[0], cy = cxy[1];
    var c = this.grid[cx][cy];
    if (c !== void 0) { // may be added into queue twice or more
      this.grid[cx][cy] = void 0;
      if ((c & cellFlags.connRight) && cx + 1 < this.width && this.grid[cx + 1][cy] !== void 0) {
        queue.push([cx + 1, cy]);
      }
      if ((c & cellFlags.connDown) && cy + 1 < this.height && this.grid[cx][cy + 1] !== void 0) {
        queue.push([cx, cy + 1]);
      }
      if ((c & cellFlags.connLeft) && cx > 0 && this.grid[cx - 1][cy] !== void 0) {
        queue.push([cx - 1, cy]);
      }
      if ((c & cellFlags.connUp) && cy > 0 && this.grid[cx][cy - 1] !== void 0) {
        queue.push([cx, cy - 1]);
      }
    }
  }
  //console.log(JSON.stringify(queue));
  return 1;
}
/**
 * Draws the stack.
 */
Stack.prototype.draw = function() {
  
  clear(stackCtx);
  if(settings.Outline === 0 || settings.Outline === 1 ||
    (settings.Outline === 2 && (gameState === 9 || gameState === 1))
  ) {
    draw(this.grid, 0, -this.hiddenHeight, stackCtx, void 0, [0.15, 0.3, 0.3][settings.Outline]);
  }
  
  if(gameparams.symmetry === 1 && timePenalty > 0){
    stackCtx.globalAlpha = 0.2;
    var tetro = this.grid;
    for (var x = 0; x < this.width; x++) {
      for (var y = this.hiddenHeight; y < this.height; y++) {
        var symmx = this.width - x - 1;
        if (!tetro[x][y] && tetro[symmx][y]) {
          var index = (tetro[symmx][y] & cellFlags.maskIndex) >> cellFlags.heightIndex;
          var color = index === 0 ? 0 : RotSys[settings.RotSys].color[pieceSymmetryIndex[index - 1]];
          drawCell(x, y - this.hiddenHeight, color, stackCtx);
        }
      }
    }
    stackCtx.globalAlpha = 1;
  }

  // Darken Stack
  // TODO wrap this with an option.
  // no fullscreen flush, see above
  //stackCtx.globalCompositeOperation = 'source-atop';
  //stackCtx.fillStyle = 'rgba(0,0,0,0.3)';
  //stackCtx.fillRect(0, 0, stackCanvas.width, stackCanvas.height);
  //stackCtx.globalCompositeOperation = 'source-over';

  if (settings.Outline === 1 || settings.Outline === 3) {
    var b = ~~(cellSize / 8);
    var c = cellSize;
    var hhc = this.hiddenHeight * c;
    var pi = Math.PI;
    var lineCanvas = document.createElement('canvas');
    lineCanvas.width = stackCanvas.width;
    lineCanvas.height = stackCanvas.height;
    
    var lineCtx = lineCanvas.getContext('2d');
    lineCtx.fillStyle = 'rgba(255,255,255,0.5)';
    lineCtx.beginPath();
    for (var x = 0, len = this.width; x < len; x++) {
      for (var y = 0, wid = this.height; y < wid; y++) {
        if (this.grid[x][y]) {
          if (x < this.width - 1 && !this.grid[x + 1][y]) {
            lineCtx.fillRect(x * c + c - b, y * c - hhc, b, c);
          }
          if (x > 0 && !this.grid[x - 1][y]) {
            lineCtx.fillRect(x * c, y * c - hhc, b, c);
          }
          if (y < this.height - 1 && !this.grid[x][y + 1]) {
            lineCtx.fillRect(x * c, y * c - hhc + c - b, c, b);
          }
          if (!this.grid[x][y - 1]) {
            lineCtx.fillRect(x * c, y * c - hhc, c, b);
          }
          // Diags
          if (x < this.width - 1 && y < this.height - 1) {
            if (!this.grid[x + 1][y] && !this.grid[x][y + 1]) {
              lineCtx.clearRect(x * c + c - b, y * c - hhc + c - b, b, b);
              lineCtx.fillRect(x * c + c - b, y * c - hhc + c - b, b, b);
            } else if (!this.grid[x + 1][y + 1] && this.grid[x + 1][y] && this.grid[x][y + 1]) {
              lineCtx.moveTo(x * c + c, y * c - hhc + c - b);
              lineCtx.lineTo(x * c + c, y * c - hhc + c);
              lineCtx.lineTo(x * c + c - b, y * c - hhc + c);
              lineCtx.arc(x * c + c, y * c - hhc + c, b, 3 * pi / 2, pi, true);
            }
          }
          if (x < this.width - 1 && y > -this.hiddenHeight) {
            if (!this.grid[x + 1][y] && !this.grid[x][y - 1]) {
              lineCtx.clearRect(x * c + c - b, y * c - hhc, b, b);
              lineCtx.fillRect(x * c + c - b, y * c - hhc, b, b);
            } else if (!this.grid[x + 1][y - 1] && this.grid[x + 1][y] && this.grid[x][y - 1]) {
              lineCtx.moveTo(x * c + c - b, y * c - hhc);
              lineCtx.lineTo(x * c + c, y * c - hhc);
              lineCtx.lineTo(x * c + c, y * c - hhc + b);
              lineCtx.arc(x * c + c, y * c - hhc, b, pi / 2, pi, false);
            }
          }
          if (x > 0 && y < this.height - 1) {
            if (!this.grid[x - 1][y] && !this.grid[x][y + 1]) {
              lineCtx.clearRect(x * c, y * c - hhc + c - b, b, b);
              lineCtx.fillRect(x * c, y * c - hhc + c - b, b, b);
            } else if (!this.grid[x - 1][y + 1] && this.grid[x - 1][y] && this.grid[x][y + 1]) {
              lineCtx.moveTo(x * c, y * c - hhc + c - b);
              lineCtx.lineTo(x * c, y * c - hhc + c);
              lineCtx.lineTo(x * c + b, y * c - hhc + c);
              lineCtx.arc(x * c, y * c - hhc + c, b, pi * 2, 3 * pi / 2, true);
            }
          }
          if (x > 0 && y > -this.hiddenHeight) {
            if (!this.grid[x - 1][y] && !this.grid[x][y - 1]) {
              lineCtx.clearRect(x * c, y * c - hhc, b, b);
              lineCtx.fillRect(x * c, y * c - hhc, b, b);
            } else if (!this.grid[x - 1][y - 1] && this.grid[x - 1][y] && this.grid[x][y - 1]) {
              lineCtx.moveTo(x * c + b, y * c - hhc);
              lineCtx.lineTo(x * c, y * c - hhc);
              lineCtx.lineTo(x * c, y * c - hhc + b);
              lineCtx.arc(x * c, y * c - hhc, b, pi / 2, pi * 2, true);
            }
          }
        }
      }
    }
    lineCtx.fill();
    stackCtx.globalCompositeOperation = 'source-over';
    stackCtx.drawImage(lineCanvas, 0, 0);
  }
  
  if (this.statisticsDirty)
    statisticsStack();
  
  this.dirty = false;
}
Stack.prototype.makeSomeArt = function(piece){
  var arrRow = [8,8,8,8,8,8,8,8,8,8];
  for(var y = 0; y < this.hiddenHeight + 1; y++){ // ensure dies
    this.rowRise(arrRow, piece);
  }
  var colors = [];
  var dc = ~~(rng.next()*rng.next()*6)+1, bc = ~~(rng.next()*7);
  for(var c=0;c<7;c++){
    colors[c]=[7,3,4,5,1,2,6][(dc*c+bc)%7];
  }
  var dx = ~~(rng.next()*7), dy = ~~(rng.next()*7),
    mod = ~~(rng.next()*7+1), bxy = ~~(rng.next()*mod);
  for(var y = 0; y < this.height; y++){
    for(var x = 0; x < this.width; x++){
      arrRow[x] = colors[(y*dy+x*dx+bxy)%mod];
    }
    this.rowRise(arrRow, piece);
  }
  this.toGreyRow = 0;
}
Stack.prototype.rotStack180 = function(){
  // find top line
  var topLine=this.height;
  break2:for(var y=0;y<this.height;y++){
    for(var x=0;x<this.width;x++){
      if(this.grid[x][y]!==void 0){
        topLine=y;
        break break2;
      }
    }
  }
  var nLine=this.height-topLine;
  // flip x
  this.grid.reverse();
  // flip y
  for(var y=0;y<nLine>>1;y++){
    var y0=topLine+y,y1=this.height-y-1;
    for(var x=0;x<this.width;x++){
      var c0=this.grid[x][y0],c1=this.grid[x][y1];
      this.grid[x][y0]=c1;
      this.grid[x][y1]=c0;
    }
  }
  for(var y=topLine;y<this.height;y++){
    for(var x=0;x<this.width;x++){
      var c=this.grid[x][y];
      if(c!==void 0){
        this.grid[x][y]=(c&~cellFlags.maskConn)|((c&0x300)<<2)|((c&0xc00)>>2);
      }
    }
  }
  digLines.reverse();
  for(var i=0;i<digLines.length;i++){
    digLines[i]=this.height+topLine-1-digLines[i];
  }
}
/**
 * single mino symmetry test
 * strict version: both empty or both mino
 */
Stack.isMinoSymmetric = function(c, symmc) {
  var symmIndexData = (symmc & cellFlags.maskIndex) >> cellFlags.heightIndex;
  var indexData = (c & cellFlags.maskIndex) >> cellFlags.heightIndex
  var conn = symmc & cellFlags.maskConn;
  // exchange left&right
  conn = (conn & cellFlags.connUp) | (conn & cellFlags.connDown) |
    ((conn & cellFlags.connLeft) ? cellFlags.connRight : 0) |
    ((conn & cellFlags.connRight) ? cellFlags.connLeft : 0) ;
  // console.log(indexData - 1, symmIndexData - 1, conn, c & cellFlags.maskConn);
  if (indexData > 0 && symmIndexData > 0 && (
    pieceSymmetryIndex[indexData - 1] !== symmIndexData - 1 ||
    (c & cellFlags.maskConn) !== conn
  )){
    return false;
  }
  return true;
}
var stack = new Stack();
