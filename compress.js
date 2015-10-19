function Compress(strNormalString)
{
  var strCompressedString = "";

  var ht = new HashTable;
  for(i = 0; i < 128; i++) {
    var e = new HashTableElement;
    e.key = i;
    e.code = i;
    ht.Insert(e);
  }

  var used = 128;
  var intLeftOver = 0;
  var intOutputCode = 0;
  var pcode = 0;
  var ccode = 0;
  var k = 0;

  for(var i=0; i<strNormalString.length; i++) {
    ccode = strNormalString.charCodeAt(i);
    k = (pcode << 8) | ccode;
    if((intSearch = ht.Search(k)) != null) {
      pcode = intSearch;
    } else {
      intLeftOver += 12;
      intOutputCode <<= 12;
      intOutputCode |= pcode;
      pcode = ccode;
      if(intLeftOver >= 16) {
        strCompressedString += String.fromCharCode( intOutputCode >> ( intLeftOver - 16 ) );
        intOutputCode &= (Math.pow(2,(intLeftOver - 16)) - 1);
        intLeftOver -= 16;
      }
      if(used < 4096) {
        used ++;
        var e = new HashTableElement;
        e.key = k;
        e.code = used - 1;
        ht.Insert(e);
      }
    }
  }

  if(pcode != 0) {
    intLeftOver += 12;
    intOutputCode <<= 12;
    intOutputCode |= pcode;
  }

  if(intLeftOver >= 16) {
    strCompressedString += String.fromCharCode( intOutputCode >> ( intLeftOver - 16 ) );
    intOutputCode &= (Math.pow(2,(intLeftOver - 16)) - 1);
    intLeftOver -= 16;
  }

  if( intLeftOver > 0) {
    intOutputCode <<= (16 - intLeftOver);
    strCompressedString += String.fromCharCode( intOutputCode );
  }

  return strCompressedString;
}

function Decompress(strCompressedString)
{
  var strNormalString = "";
  var ht = new Array;

  for(i = 0; i < 128; i++)
  {
    ht[i] = String.fromCharCode(i);
  }

  var used = 128;
  var intLeftOver = 0;
  var intOutputCode = 0;
  var ccode = 0;
  var pcode = 0;
  var key = 0;

  for(var i=0; i<strCompressedString.length; i++) {
    intLeftOver += 16;
    intOutputCode <<= 16;
    intOutputCode |= strCompressedString.charCodeAt(i);
    while(1) {
      if(intLeftOver >= 12) {
          ccode = intOutputCode >> (intLeftOver - 12);
        if( typeof( key = ht[ccode] ) != "undefined" ) {
          strNormalString += key;
          if(used > 128) {
            ht[ht.length] = ht[pcode] + key.substr(0, 1);
          }
          pcode = ccode;
        } else {
          key = ht[pcode] + ht[pcode].substr(0, 1);
          strNormalString += key;
          ht[ht.length] = ht[pcode] + key.substr(0, 1);
          pcode = ht.length - 1;
        }used ++;
        intLeftOver -= 12;
        intOutputCode &= (Math.pow(2,intLeftOver) - 1);
      } else {
        break;
      }
    }
  }
  return strNormalString;
}

function HashTableElement()
{
  this.key = null;
  this.code = null;
}

function HashTable()
{
  this.ht = new Array(4099);

  this.Search = function(keyword) {
    var arr = this.ht[keyword];
    if(typeof(arr) != "undefined") {
      for(i = 0; i < arr.length; i ++) {
        if(arr[i].key == keyword) return arr[i].code;
      }
    }
    return null;
  }
  this.Insert = function(e) {
    var arr = this.ht[e.key];
    if(typeof(arr) == "undefined") {
    arr = new Array();
    arr[0] = e;
    this.ht[e.key] = arr;
    } else {
      arr[arr.length] = e;
    }
  }
}

function writeVL4(arr, num) {
  var halfByte;
  do {
    halfByte = num & 7;
    num >>= 3;
    if(num !== 0)
      halfByte |= 8;
    arr.push(halfByte);
  } while (num !== 0)
}

function scanVL4(arr, ptr, refNum) {
  var halfByte;
  var len = 0;
  var num = 0;
  do {
    halfByte = arr[ptr];
    if(halfByte === void 0)
      return null; // error
      //throw 4;
    num |= (halfByte & 7) << (len * 3);
    if((halfByte & 8) === 8)
      len++;
    ptr++;
  } while ((halfByte & 8) === 8)
  if(len > 0 && num < 8)
    return -1;
  else {
    refNum[0] = num;
    return ptr;
  }
}

var base67 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_+=@"; // 67*67 < 16*16*16 + 16*16 + 16
var base67rev = (function() {
  var rev = {};
  for(var i=0; i<base67.length; i++) {
    rev[base67[i]] = i;
  }
  return rev;
})();

function keysEncode(keys) {
  var lastFrame = 0;
  var lastKeys = 0;
  var arrHB = [];
  var arrBase67 = [];
  var curFrame, curKeys;
  for(var i in keys) {
    curFrame = +i;
    curKeys = keys[i];
    for(var xhb=0; xhb<10; xhb++) {
      if((curKeys ^ lastKeys) & (1 << xhb)) {
        writeVL4(arrHB, curFrame - lastFrame);
        arrHB.push(xhb);
        //console.log("key", curFrame - lastFrame, xhb, i)
        lastFrame = curFrame;
      }
    }
    lastKeys = curKeys;
  }
  arrHB.push(8);
  arrHB.push(0);
  
  //console.log(arrHB);
  
  var nHB = arrHB.length;
  var sum;
  for(var ptr=0; ptr<nHB; ptr+=3) {
    if(nHB - ptr >= 3) {
      sum = (arrHB[ptr] + arrHB[ptr+1]*16 + arrHB[ptr+2]*16*16);
    } else if(nHB - ptr == 2) {
      sum = (arrHB[ptr] + arrHB[ptr+1]*16 + 16*16*16);
    } else if(nHB - ptr == 1) {
      sum = (arrHB[ptr] + 16*16 + 16*16*16);
    }
    //console.log(sum);
    arrBase67.push(base67[sum%67] + base67[~~(sum/67)]);
  }
  
  return arrBase67.join("");
}

function keysDecode(str) {
  var lastFrame = 0;
  var lastKeys = 0;
  var keys = {};
  var arrHB = [];
  var arrBase67 = [];
  var objNum = [0]; // pass by reference
  
  if(str.length%2 !== 0)
    return null;
  
  for(var ptr=0; ptr<str.length; ptr+=2) {
    var lo67 = base67rev[str[ptr]], hi67 = base67rev[str[ptr+1]];
    //console.log(lo67 + " " + hi67 + " " + (lo67 + hi67 * 67));
    if((lo67 === void 0) || (hi67 === void 0))
      return null;
      //throw 1;
    arrBase67.push(lo67 + hi67 * 67);
  }
  
  for(var i=0; i<arrBase67.length; i++) {
    var data = arrBase67[i];
    //console.log(data);
    if(data < 16*16*16) {
      arrHB.push(data & 15); data >>= 4;
      arrHB.push(data & 15); data >>= 4;
      arrHB.push(data & 15);
    } else if(data < 16*16*16 + 16*16) {
      data -= 16*16*16;
      arrHB.push(data & 15); data >>= 4;
      arrHB.push(data & 15);
    } else if(data < 16*16*16 + 16*16 + 16) {
      data -= 16*16*16 + 16*16;
      arrHB.push(data & 15);
    } else {
      //return null;
      throw 2;
    }
  }
  
  //console.log(arrHB.length, arrHB.toString());
  
  for(var i=0; i<arrHB.length;) {
    var nexti;
    nexti = scanVL4(arrHB, i, objNum);
    if(nexti === null) {
      //return null;
      console.log("scanVL4 null:",i,arrHB.length);
      throw 3;
    }
    if(nexti === -1)
      break;
    i = nexti;
    lastFrame += objNum[0];
    lastKeys ^= (1 << arrHB[i]); // flip that bit
    keys[lastFrame] = lastKeys;
    //console.log("event:",objNum[0],"F interval, key:", arrHB[i]);
    i++;
  }
  
  return keys;
}