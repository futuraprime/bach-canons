// prototype code for the bach canons work
var AudioContext = window.AudioContext || window.webkitAudioContext;
var context = new AudioContext();

var wholeNote = 0.75;

// steps is steps from A4
function ntf(steps) {
  return 440 * Math.pow(2, (steps/12));
}

function playFrequency(frequency, duration, offset) {
  offset = offset || 0;
  var oscillator = context.createOscillator();
  var time = context.currentTime + offset;

  oscillator.frequency.value = frequency;
  oscillator.connect(context.destination);

  oscillator.noteOn(time);
  oscillator.noteOff(time + duration);
}

var C  = ntf(-9);
var Cs = ntf(-8);
var D  = ntf(-7);
var Ds = ntf(-6);
var E  = ntf(-5);
var F  = ntf(-4);
var Fs = ntf(-3);
var G  = ntf(-2);
var Gs = ntf(-1);
var A  = ntf( 0);
var As = ntf( 1);
var B  = ntf( 2);

function parseNote(note, octave, duration) {
  if(note instanceof Array) {
    duration = note[2];
    octave = note[1];
    note = note[0];
  }
  var frequency = note * Math.pow(2, octave - 4);
  return [frequency, duration];
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
]).map(parseNote);

function bendNote(note, steps) {
  return [
    note[0] * Math.pow(2, (steps/12)),
    note[1]
  ];
}

var inC = BWV1074.map(function(note) { return note; });
var inG = BWV1074.map(function(note) {
  return bendNote(note, -4);
});
var inA = BWV1074.map(function(note) {
  return bendNote(note, 3);
});
var inD = BWV1074.map(function(note) {
  return bendNote(note, -10);
});

function canon(loop, repetitions, delay) {
  delay = delay === undefined ? 0 : delay;
  repetitions = repetitions === undefined ? 1 : repetitions;
  var time = context.currentTime + delay;
  var size = 0;
  for(var j=0;j<repetitions;++j) {
    for(var i=0,l=loop.length;i<l;++i) {
      playFrequency(loop[i][0], loop[i][1], size + delay);
      size += loop[i][1];
    }
  }
}

var play = document.getElementById('play');
play.addEventListener('click', function() {
  canon(inG, 2);
  canon(inC, 2, 0.5);
  canon(inA, 2, 1);
  canon(inD, 2, 1.5);
});
