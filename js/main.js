// prototype code for the bach canons work
var AudioContext = window.AudioContext || window.webkitAudioContext;
var context = new AudioContext();

var wholeNote = 0.75;

// steps is steps from A4
function ntf(steps) {
  return 440 * Math.pow(2, (steps/12));
}

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
  var newVoice = new Voice(this.loop, transform, delay);
  this.voices[name] = newVoice;
  return newVoice;
};
Canon.prototype.play = function() {
  var time = context.currentTime + 0.1;
  for(var k in this.voices) {
    this.voices[k].play(time);
  }
};

// the "voice" is the core component of the canon: canons
// are composed of several voices.
// voices all belong to a canon, and have a transform function
// applied to them, as well as a delay to account for when they
// come in
function Voice(canon, transform, delay) {
  this.loop = canon.loop;
  this.setTransform(transform);
  this.delay = delay === undefined ? 0 : delay;
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
  var cursor = 0;
  var loop = this._loop;    // note: this is the TRANSFORMED loop
  for(var j=0;j<repetitions;++j) {
    for(var i=0,l=loop.length;i<l;++i) {
      playFrequency(loop[i][0], loop[i][1], time, size + delay);
      size += loop[i][1];
    }
  }
};
