// prototype code for the bach canons work
var AudioContext = window.AudioContext || window.webkitAudioContext;
var context = new AudioContext();

var wholeNote = 1;

// steps is steps from A4
function ntf(steps) {
  return 440 * Math.pow(2, (steps/12));
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


// this is (currently) our musical instrument
function playFrequency(frequency, duration, start, offset, gain) {
  offset = offset || 0;
  var oscillator = context.createOscillator();
  var compressor = context.createDynamicsCompressor();
  var damper = context.createWaveShaper();
  var time = start + offset || context.currentTime + offset;

  gain = gain || context.createGain();
  oscillator.frequency.value = frequency;
  compressor.attack.value = 0.002;
  var n = 65536;
  var curve = new Float32Array(n), i;
  for (i=0; i<(n/2); i++)
    curve[i] = 0.0;
  for (i=(n/2); i<n; i++)
      curve[i] = Math.pow(i/(n/2), 2) - 1;
  damper.curve = curve;

  oscillator.connect(compressor);
  compressor.connect(damper);
  damper.connect(gain);
  gain.connect(context.destination);

  oscillator.noteOn(time);
  oscillator.noteOff(time + duration);
}



function Canon(loop) {
  this.loop = loop;
  this.voices = {};
}
Canon.prototype.addVoice = function(name, transform, delay) {
  var newVoice = new Voice(this, transform, delay);
  this.voices[name] = newVoice;
  return newVoice;
};
Canon.prototype.play = function(repetitions) {
  var time = context.currentTime + 0.1;
  for(var k in this.voices) {
    this.voices[k].play(time, repetitions);
  }
};

// the "voice" is the core component of the canon: canons
// are composed of several voices.
// voices all belong to a canon, and have a transform function
// applied to them, as well as a delay to account for when they
// come in
function Voice(canon, delay, transform) {
  this.loop = canon.loop;
  this.setTransform(transform);
  this.delay = delay === undefined ? 0 : delay * wholeNote;
  this.gain = null;
}
Voice.prototype.setTransform = function(transform) {
  // not sure we need this caching, but just in case we do...
  this._transform = transform;
  if(transform instanceof Function) {
    this._loop = this.loop.map(transform);
  } else {
    this._loop = this.loop.slice(); // clone array
  }
};
Voice.prototype.play = function(startTime, repetitions) {
  repetitions = repetitions === undefined ? 1 : repetitions;
  var time = startTime + this.delay;
  console.log(startTime, time);
  var cursor = 0;
  var loop = this._loop;    // note: this is the TRANSFORMED loop
  for(var j=0;j<repetitions;++j) {
    for(var i=0,l=loop.length;i<l;++i) {
      playFrequency(loop[i][0], loop[i][1] * wholeNote, time, cursor);
      cursor += loop[i][1] * wholeNote;
    }
  }
};

// this *returns* a transform function
function shiftPitch(steps) {
  return function(note) {
    return [
      note[0] * Math.pow(2, (steps/12)),
      note[1]
    ];
  };
}

var BWV1074_Canon_1 = new Canon(BWV1074);
BWV1074_Canon_1.addVoice('G', 0  , shiftPitch(-4));
BWV1074_Canon_1.addVoice('C', 0.5);
BWV1074_Canon_1.addVoice('A', 1  , shiftPitch(3));
BWV1074_Canon_1.addVoice('D', 1.5, shiftPitch(-10));

var playButton = document.getElementById('play');
play.addEventListener('click', function() {
  BWV1074_Canon_1.play(1);
});
