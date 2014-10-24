// prototype code for the bach canons work
var AudioContext = window.AudioContext || window.webkitAudioContext;
var context = new AudioContext();

// W053: allow string constructors
/* jshint -W053 */
// first, for simplicity:
var C   = new String('C');
var Bs  = C;
var Cs  = new String('C#');
var D   = new String('D');
var Ds  = new String('D#');
var E   = new String('E');
var F   = new String('F');
var Es  = F;
var Fs  = new String('F#');
var G   = new String('G');
var Gs  = new String('G#');
var A   = new String('A');
var As  = new String('A#');
var B   = new String('B');
/* jshint +W053 */

C.next  = Cs;
Cs.next = D;
D.next  = Ds;
Ds.next = E;
E.next  = F;
F.next  = Fs;
Fs.next = G;
G.next  = Gs;
Gs.next = A;
A.next  = As;
As.next = B;

Cs.prev = C;
D.prev  = Cs;
Ds.prev = D;
E.prev  = Ds;
F.prev  = E;
Fs.prev = F;
G.prev  = Fs;
Gs.prev = G;
A.prev  = Gs;
As.prev = A;
B.prev  = As;


var wholeNote = 2; // seconds
function generateNote(note, octave, size) {
  if(note instanceof Array) {
    size = note[2];
    octave = note[1];
    note = note[0];
  }
  var blob = Synth.generate('piano', note, octave, size * wholeNote);
  var reader = new FileReader();
  var buffer = null;
  reader.addEventListener('loadend', function() {
    context.decodeAudioData(reader.result, function(b) {
      buffer = b;
    });
  });
  reader.readAsArrayBuffer(blob);
  var fn = function(time) {
    time = time === undefined ? 0 : time;
    var source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);

    source.start(time);
  };
  fn.size = size;

  return fn;
}

function declineNote(note, steps) {
  note = note.slice();
  for(var i=0;i<steps;++i) {
    if(note[0].prev) {
      note[0] = note[0].prev;
    } else {
      note[0] = B;
      note[1] -= 1;
    }
  }
  return note;
}

function ascendNote(note, steps) {
  note = note.slice();
  for(var i=0;i<steps;++i) {
    if(note[0].next) {
      note[0] = note[0].next;
    } else {
      note[0] = C;
      note[1] += 1;
    }
  }
  return note;
}

var BWV1074 = ([
  [C, 4, 0.5  ],
  [F, 4, 1    ],
  [D, 4, 0.5  ],
  [E, 4, 1    ],
  [C, 4, 0.5  ],
  [D, 4, 0.5  ],
  [B, 3, 0.75 ],
  [A, 3, 0.25 ],
  [B, 3, 0.25 ]
]);
var inC = BWV1074.map(generateNote);
var inG = BWV1074.map(function(note) {
  return declineNote(note, 4);
}).map(generateNote);
var inA = BWV1074.map(function(note) {
  return ascendNote(note, 3);
}).map(generateNote);
var inD = BWV1074.map(function(note) {
  return declineNote(note, 10);
}).map(generateNote);

function canon(loop, repetitions, delay) {
  delay = delay === undefined ? 0 : delay;
  repetitions = repetitions === undefined ? 1 : repetitions;
  var time = context.currentTime + delay;
  console.log(delay, time);
  var n = 1;
  var size = 0;
  for(var j=0;j<repetitions;++j) {
    for(var i=0,l=loop.length;i<l;++i) {
      loop[i](time + n * size);
      size += loop[i].size;
    }
  }
}

var play = document.getElementById('play');
play.addEventListener('click', function() {
  canon(inG, 3);
  canon(inC, 3, 0.5);
  canon(inA, 3, 1);
  canon(inD, 3, 1.5);
});
