// prototype code for the bach canons work
var AudioContext = window.AudioContext || window.webkitAudioContext;
var context = new AudioContext();

// first, for simplicity:
var A = 'A';
var Asharp = 'A#';
var B = 'B';
var Bsharp = 'C';
var C = 'C';
var Csharp = 'C#';
var D = 'D';
var Dsharp = 'D#';
var E = 'E';
var Esharp = 'F';
var F = 'F';
var Fsharp = 'F#';
var G = 'G';
var Gsharp = 'G#';

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
  return function() {
    var source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);

    source.start(0);
  };
}


var BWV1074 = ([
  [C, 4, 0.5  ],
  [F, 4, 1    ],
  [D, 4, 0.5  ],
  [E, 4, 1    ],
  [C, 4, 0.5  ],
  [D, 4, 0.5  ],
  [B, 4, 0.75 ],
  [A, 4, 0.25 ],
  [B, 4, 0.25 ]
]).map(generateNote);

var play = document.getElementById('play');
play.addEventListener('click', function() {
  // Synth.play('piano', 'C', 4, 2);
});
