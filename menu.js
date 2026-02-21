var version       = '0.70';
var setLoop;
var arrowReleased = true;
var arrowDelay    = 0;

var key = {
  8:   'Backspace',
  9:   'Tab',
  13:  'Enter',
  16:  'Shift',
  17:  'Ctrl',
  18:  'Alt',
  19:  'Pause',
  20:  'Caps Lock',
  27:  'Esc',
  32:  'Space',
  33:  'PgUp',
  34:  'PgDn',
  35:  'End',
  36:  'Home',
  37:  '←',
  38:  '↑',
  39:  '→',
  40:  '↓',
  45:  'Insert',
  46:  'Delete',
  48:  '0',
  49:  '1',
  50:  '2',
  51:  '3',
  52:  '4',
  53:  '5',
  54:  '6',
  55:  '7',
  56:  '8',
  57:  '9',
  59:  ';',
  61:  '=',
  65:  'A',
  66:  'B',
  67:  'C',
  68:  'D',
  69:  'E',
  70:  'F',
  71:  'G',
  72:  'H',
  73:  'I',
  74:  'J',
  75:  'K',
  76:  'L',
  77:  'M',
  78:  'N',
  79:  'O',
  80:  'P',
  81:  'Q',
  82:  'R',
  83:  'S',
  84:  'T',
  85:  'U',
  86:  'V',
  87:  'W',
  88:  'X',
  89:  'Y',
  90:  'Z',
  96:  '0kpad',
  97:  '1kpad',
  98:  '2kpad',
  99:  '3kpad',
  100: '4kpad',
  101: '5kpad',
  102: '6kpad',
  103: '7kpad',
  104: '8kpad',
  105: '9kpad',
  106: '*',
  107: '+',
  109: '-',
  110: '.',
  111: '/',
  112: 'F1',
  113: 'F2',
  114: 'F3',
  115: 'F4',
  116: 'F5',
  117: 'F6',
  118: 'F7',
  119: 'F8',
  120: 'F9',
  121: 'F10',
  122: 'F11',
  123: 'F12',
  173: '-',
  186: ';',
  187: '=',
  188: ',',
  189: '-',
  190: '.',
  191: '/',
  192: '`',
  219: '[',
  220: '\\',
  221: ']',
  222: "'",
  undefined: "---",
  0: "---"
};

/**
 * Show and hide menus.
 */
var menus     = document.getElementsByClassName('menu');
var menuStack = [];
function menu(menuIndex, stackOper) {
  var current = void 0;
  for (var i = 0, len = menus.length; i < len; i++) {
    if (menus[i].classList.contains('on')) {
      current = i;
    }
    menus[i].classList.remove('on');
  }

  if (menuIndex !== void 0) {
    menus[menuIndex].classList.add('on');
  }

  if (stackOper === 1) {
    if (current !== void 0) {
      menuStack.push(current);
    }
  } else if (stackOper === -1) {
    current = menuStack.pop();
    if ((current !== void 0) && (menuIndex === void 0)) {
      menus[current].classList.add('on');
    }
  } else if (stackOper !== 0) {
    menuStack = [];
  }
}

/**
 * Controls Menu
 */
var newKey, currCell, tempKey, controls = document.getElementById('controls'), controlCells = controls.getElementsByTagName('td');
// Give controls an event listener.
for (var i = 0, len = controlCells.length; i < len; i++) {
  controlCells[i].onclick = function () {
    // First check if we're already waiting for an input.
    if (currCell) {
      // TODO DRY
      // Make this into a function and call it when we press Esc.
      binds[currCell.id] = tempKey;
      $setText(currCell, key[tempKey] || tempKey);
    }
    tempKey        = binds[this.id];
    $setText(this, 'Press key');
    currCell       = this;
  }
}
// Listen for key input if a control has been clicked on.
addEventListener('keyup', function (e) {
  // if click outside of cell or press esc clear currCell
  // reset binds button.
  if (currCell) {
    var newKey=e.keyCode;
    if(newKey===8){
      newKey=void 0;
    }
    // Checks if key already in use, and unbinds it.
    if(newKey){
      for (var i in binds) {
        if (newKey === binds[i]) {
          binds[i] = void 0;
          $setText($$(i), key[void 0]);
        }
      }
    }
    // Binds the key and saves the data.
    binds[currCell.id] = newKey;
    $setText(currCell, key[newKey] || newKey);
    localStorage.setItem('binds', JSON.stringify(binds));
    currCell           = 0;
  }
}, false);

/**
 * Settings Menu
 */
function settingsLoop() {
  if (arrowReleased || arrowDelay >= 6) {
    if (settingsArrow) {
      mySettings[s] = (mySettings[s] === 0) ? setting[s].length - 1 : mySettings[s] - 1;
    } else {
      mySettings[s] = (mySettings[s] === setting[s].length - 1) ? 0 : mySettings[s] + 1;
    }
    saveSetting(s);
    arrowReleased = false;
  } else {
    arrowDelay++;
  }
  setLoop = setTimeout(settingsLoop, 50);
}
var s;
var settingsArrow;
// TODO DRY this.
function arrowRelease(e) {
  //resize();
  arrowReleased = true;
  arrowDelay    = 0;
  clearTimeout(setLoop);
  this.onmouseup     = void 0;
  this.onmouseout    = void 0;
  this.ontouchend    = void 0;
  this.ontouchcancel = void 0;
  if (e && e.preventDefault) {
    e.preventDefault();
  } //avoid selection by touch
}
function left(e) {
  settingsArrow      = 1;
  s                  = this.parentNode.id;
  this.onmouseup     = arrowRelease;
  this.onmouseout    = arrowRelease;
  this.ontouchend    = arrowRelease;
  this.ontouchcancel = arrowRelease;
  if (e && e.preventDefault) {
    e.preventDefault();
  } //avoid selection by touch
  settingsLoop();
}
function right(e) {
  settingsArrow      = 0;
  s                  = this.parentNode.id;
  this.onmouseup     = arrowRelease;
  this.onmouseout    = arrowRelease;
  this.ontouchend    = arrowRelease;
  this.ontouchcancel = arrowRelease;
  if (e && e.preventDefault) {
    e.preventDefault();
  } //avoid selection by touch
  settingsLoop();
}

/**
 * LocalStorage functions
 */
function updateSettingSpan(span, s) {
  $setText(span, setting[s][mySettings[s]]);
  var value=mySettings[s];
  if (s === "DAS") {
    span.style.color="hsl("+((value*20+300)%360)+",100%,75%)";
  }
  if (s === "ARR") {
    span.style.color="hsl("+((Math.sqrt(value)*60+60)%360)+",100%,75%)";
  }
  if (s === "LockDelay") {
    span.style.color="hsl(0,100%,"+(Math.min(100,50+Math.sqrt(value)*15))+"%)";
  }
  if (s === "AREDelay") {
    span.style.color="hsl(0,0%,"+(Math.max(20,100-Math.sqrt(value)*20))+"%)";
  }
  
}
function saveSetting(s) {
  if (localStorage === void 0) {
    localStorage = {};
  }
  localStorage['version'] = version;

  updateSettingSpan($$(s).getElementsByTagName('span')[0], s);

  localStorage['settings'] = JSON.stringify(mySettings);
}
function loadLocalData() {
  if (localStorage === void 0) {
    localStorage = {};
  }
  if (localStorage['binds']) {
    binds = JSON.parse(localStorage.getItem('binds'));
    for (var i = 0, len = controlCells.length; i < len; i++) {
      var keycode=binds[controlCells[i].id];
      $setText(controlCells[i], key[keycode] || keycode);
    }
  }else{
    $$("btnbinds").classList.add("highlight");
  }
  // TODO When new version just update with new stuff, rest stays unchanged.
  var storedSettings;
  if (localStorage['settings']) {
    storedSettings = JSON.parse(localStorage.getItem('settings'));
    if (localStorage['version'] !== version) {
      try{
        tryUpgradeSetting(storedSetting);
        localStorage['settings'] = JSON.stringify(mySettings);
      }catch(e){
        localStorage.removeItem('settings');
      }
    }
  }
  if (localStorage['settings']) {
    for (var i in mySettings) {
      if (i in storedSettings) {
        mySettings[i] = storedSettings[i];
      }
    }
  }
}

loadLocalData();
for (var s in settingName) {
  var div    = document.createElement('div');
  var sname  = document.createElement('b');
  var iLeft  = document.createElement('i');
  var span   = document.createElement('span');
  var iRight = document.createElement('i');

  div.id              = s;
  $setText(sname, settingName[s]);
  updateSettingSpan(span, s);
  iLeft.className     = 'material-icons left';
  iRight.className    = 'material-icons right';
  $setText(iLeft, "\uE314");
  $setText(iRight, "\uE315");
  iLeft.onmousedown   = left;
  iLeft.ontouchstart  = left;
  iRight.onmousedown  = right;
  iRight.ontouchstart = right;

  set.appendChild(div);
  div.appendChild(sname);
  div.appendChild(iLeft);
  div.appendChild(span);
  div.appendChild(iRight);
}
function renameTransfer(obj, oldName, newName, f){
  if(obj[oldName] === void 0 && obj[newName] === void 0){
    throw oldName+","+newName;
  }
  if(obj[oldName] !== void 0 && obj[newName] === void 0){
    obj[newName] = f?f(obj[oldName]):obj[oldName];
    delete obj[oldName];
  }
}
function tryUpgradeSetting(sett){
  renameTransfer(sett, 'Lock Delay', "LockDelay");
  renameTransfer(sett, 'Soft Drop', "SoftDrop", function(oldv){
    if(oldv === 7){
      return gravityArr.length - 1;
    }else{
      return oldv + 1;
    }
  });
  if(sett.AREDelay === void 0){
    sett.AREDelay = 0;
  }
}