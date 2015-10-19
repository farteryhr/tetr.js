function Hold() {
  this.piece;
}
Hold.prototype.draw = function() {
  clear(holdCtx);
  var initInfo = RotSys[settings.RotSys].initinfo[this.piece];
  if (this.piece === 0 || this.piece === 3) {
    draw(pieces[this.piece].tetro[initInfo[2]], pieces[this.piece].x - 3,
         2 + pieces[this.piece].y + initInfo[1], holdCtx);
  } else {
    draw(pieces[this.piece].tetro[initInfo[2]], pieces[this.piece].x - 2.5,
         2 + pieces[this.piece].y + initInfo[1], holdCtx);
  }
}
var hold = new Hold();
