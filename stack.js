function Stack() {
  //this.grid;
}
/**
 * Creates a matrix for the playfield.
 */
Stack.prototype.new = function(x, y) {
  var cells = new Array(x);
  for (var i = 0; i < x; i++) {
    cells[i] = new Array(y);
  }
  this.grid = cells;
}
/**
 * Adds tetro to the stack, and clears lines if they fill up.
 */
Stack.prototype.addPiece = function(tetro) {
  var lineClear = 0;
  var isSpin = false;
  var once = false;

  // spin check
  if (
    !piece.moveValid(-1, 0, piece.tetro) &&
    !piece.moveValid( 1, 0, piece.tetro) &&
    !piece.moveValid( 0,-1, piece.tetro)
  ) {
    isSpin = true;
  }
  
  // Add the piece to the stack.
  var range = [];
  var valid = false;
  for (var x = 0; x < tetro.length; x++) {
    for (var y = 0; y < tetro[x].length; y++) {
      if (tetro[x][y]) {
        this.grid[x + piece.x][y + piece.y] = tetro[x][y];
        // Get column for finesse
        if (!once || x + piece.x < column) {
          column = x + piece.x;
          once = true;
        }
        // Check which lines get modified
        if (range.indexOf(y + piece.y) === -1) {
          range.push(y + piece.y);
          // This checks if any cell is in the play field. If there
          //  isn't any this is called a lock out and the game ends.
          if (y + piece.y > 1) valid = true;
        }
      }
    }
  }

  // Lock out
  if (!valid) {
    gameState = 9;
    msg.innerHTML = 'LOCK OUT!';
    menu(3);
    return;
  }

  // Check modified lines for full lines.
  range = range.sort(function(a,b){return a-b});
  for (var row = range[0], len = row + range.length; row < len; row++) {
    var count = 0;
    for (var x = 0; x < 10; x++) {
      if (this.grid[x][row]) count++;
    }
    // Clear the line. This basically just moves down the stack.
    // TODO Ponder during the day and see if there is a more elegant solution.
    if (count === 10) {
      lineClear++; // NOTE stats
      if (gametype === 4) { // dig race
        if (digLines.indexOf(row) !== -1) {
          digLines.splice(digLines.indexOf(row), 1);
        }
      }
      for (var y = row; y >= -1; y--) {
        for (var x = 0; x < 10; x++) {
          this.grid[x][y] = this.grid[x][y - 1];
        }
      }
    }
  }

  var scoreAdd = bigInt(level + 1);
  if (lineClear !== 0) {
    //console.log("C"+combo+" B"+b2b)
    if (isSpin) {
      scoreAdd = scoreAdd.mul(
        bigInt([800,1200,1600,2000][lineClear - 1])
          .mul(bigInt(2).pow(b2b + combo))
      );
      b2b += 1;
    } else if(lineClear === 4) {
      scoreAdd = scoreAdd.mul(
        bigInt(800)
          .mul(bigInt(2).pow(b2b + combo))
      );
      b2b += 1;
    } else {
      scoreAdd = scoreAdd.mul(
        bigInt([100,300,500,800][lineClear - 1])
          .mul(bigInt(2).pow(combo))
      );
      b2b = 0;
    }
    combo += 1;
  } else {
    if (isSpin) {
      scoreAdd = scoreAdd.mul(
        bigInt(2).pow(bigInt(b2b))
          .mul(bigInt(400))
      );
    } else {
      scoreAdd = bigInt(0);
    }
    combo = 0;
  }
  lines += lineClear;
  if (gametype === 1)
    level = ~~(lines / 10);
  score = score.add(scoreAdd.mul(bigInt(16).pow(allclear)));
  
  var pc = true;
  for (var x = 0; x < 10; x++)
    for (var y = 0; y < 22; y++)
      if (this.grid[x][y])
        pc = false;
  if (pc) {
    score = score.add(bigInt(1000000).mul(bigInt(16).pow(allclear)));
    allclear ++;
  }
  
  //if (scoreAdd.cmp(0) > 0)
    //console.log(scoreAdd.toString());

  statsFinesse += piece.finesse - finesse[piece.index][piece.pos][column];
  piecesSet++; // NOTE Stats
  // TODO Might not need this (same for in init)
  column = 0;

  statisticsStack();

  this.draw();
}
/**
 * Raise a garbage line. farter
 */
Stack.prototype.rowRise = function(arrRow, objPiece) {
  for(var x = 0; x < 10; x++) {
    for(var y = 0; y < this.grid[x].length - 1; y++) {
      this.grid[x][y]=this.grid[x][y+1];
    }
    this.grid[x][this.grid[x].length-1]=arrRow[x];
  }
  if(digLines) {
    for(var y = 0; y < digLines.length; y++) {
      digLines[y]--;
    }
  }
  digLines.push(21);
  if (!piece.moveValid(0, 0, piece.tetro)) {
    piece.y-=1;
    if (piece.y < pieces[piece.index].y - 2) {
      gameState = 9;
      msg.innerHTML = 'OOPS!';
      menu(3);
    }
  }
  piece.dirty = true;
  this.draw();
}
/**
 * Draws the stack.
 */
Stack.prototype.draw = function() {
  
  clear(stackCtx);
  draw(this.grid, 0, 0, stackCtx, void 0, 0.3);

  // Darken Stack
  // TODO wrap this with an option.
  // no fullscreen flush, see above
  //stackCtx.globalCompositeOperation = 'source-atop';
  //stackCtx.fillStyle = 'rgba(0,0,0,0.3)';
  //stackCtx.fillRect(0, 0, stackCanvas.width, stackCanvas.height);
  //stackCtx.globalCompositeOperation = 'source-over';

  if (settings.Outline) {
    var b = ~~(cellSize / 8);
    var c = cellSize;
    var lineCanvas = document.createElement('canvas');
    lineCanvas.width = stackCanvas.width;
    lineCanvas.height = stackCanvas.height;
    
    var lineCtx = lineCanvas.getContext('2d');
    lineCtx.fillStyle = 'rgba(255,255,255,0.5)';
    lineCtx.beginPath();
    for (var x = 0, len = this.grid.length; x < len; x++) {
      for (var y = 0, wid = this.grid[x].length; y < wid; y++) {
        if (this.grid[x][y]) {
          if (x < 9 && !this.grid[x + 1][y]) {
            lineCtx.fillRect(x * c + c - b, y * c - (2 * c), b, c);
          }
          if (x > 0 && !this.grid[x - 1][y]) {
            lineCtx.fillRect(x * c, y * c - (2 * c), b, c);
          }
          if (y < 21 && !this.grid[x][y + 1]) {
            lineCtx.fillRect(x * c, y * c - (2 * c) + c - b, c, b);
          }
          if (!this.grid[x][y - 1]) {
            lineCtx.fillRect(x * c, y * c - (2 * c), c, b);
          }
          // Diags
          if (x < 9 && y < 21) {
            if (!this.grid[x + 1][y] && !this.grid[x][y + 1]) {
              lineCtx.clearRect(x * c + c - b, y * c - (2 * c) + c - b, b, b);
              lineCtx.fillRect(x * c + c - b, y * c - (2 * c) + c - b, b, b);
            } else if (!this.grid[x + 1][y + 1] && this.grid[x + 1][y] && this.grid[x][y + 1]) {
              lineCtx.moveTo(x * c + c, y * c - (2 * c) + c - b);
              lineCtx.lineTo(x * c + c, y * c - (2 * c) + c);
              lineCtx.lineTo(x * c + c - b, y * c - (2 * c) + c);
              lineCtx.arc(x * c + c, y * c - (2 * c) + c, b, 3 * Math.PI / 2, Math.PI, true);
            }
          }
          if (x < 9) {
            if (!this.grid[x + 1][y] && !this.grid[x][y - 1]) {
              lineCtx.clearRect(x * c + c - b, y * c - (2 * c), b, b);
              lineCtx.fillRect(x * c + c - b, y * c - (2 * c), b, b);
            } else if (!this.grid[x + 1][y - 1] && this.grid[x + 1][y] && this.grid[x][y - 1]) {
              lineCtx.moveTo(x * c + c - b, y * c - (2 * c));
              lineCtx.lineTo(x * c + c, y * c - (2 * c));
              lineCtx.lineTo(x * c + c, y * c - (2 * c) + b);
              lineCtx.arc(x * c + c, y * c - (2 * c), b, Math.PI / 2, Math.PI, false);
            }
          }
          if (x > 0 && y < 21) {
            if (!this.grid[x - 1][y] && !this.grid[x][y + 1]) {
              lineCtx.clearRect(x * c, y * c - (2 * c) + c - b, b, b);
              lineCtx.fillRect(x * c, y * c - (2 * c) + c - b, b, b);
            } else if (!this.grid[x - 1][y + 1] && this.grid[x - 1][y] && this.grid[x][y + 1]) {
              lineCtx.moveTo(x * c, y * c - (2 * c) + c - b);
              lineCtx.lineTo(x * c, y * c - (2 * c) + c);
              lineCtx.lineTo(x * c + b, y * c - (2 * c) + c);
              lineCtx.arc(x * c, y * c - (2 * c) + c, b, Math.PI * 2, 3 * Math.PI / 2, true);
            }
          }
          if (x > 0) {
            if (!this.grid[x - 1][y] && !this.grid[x][y - 1]) {
              lineCtx.clearRect(x * c, y * c - (2 * c), b, b);
              lineCtx.fillRect(x * c, y * c - (2 * c), b, b);
            } else if (!this.grid[x - 1][y - 1] && this.grid[x - 1][y] && this.grid[x][y - 1]) {
              lineCtx.moveTo(x * c + b, y * c - (2 * c));
              lineCtx.lineTo(x * c, y * c - (2 * c));
              lineCtx.lineTo(x * c, y * c - (2 * c) + b);
              lineCtx.arc(x * c, y * c - (2 * c), b, Math.PI / 2, Math.PI * 2, true);
            }
          }
        }
      }
    }
    lineCtx.fill();
    stackCtx.globalCompositeOperation = 'source-over';
    stackCtx.drawImage(lineCanvas, 0, 0);
  }
}
var stack = new Stack();
