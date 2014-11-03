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

function parseNote(note, octave, duration, position) {
  if(note instanceof Array) {
    position = note[3];
    duration = note[2];
    octave = note[1];
    note = note[0];
  }
  var frequency = note * Math.pow(2, octave - 4);
  return [frequency, duration, position];
}

var BWV1074 = ([
  [C, 4, 0.5 , 0.0 ],
  [F, 4, 1   , 0.5 ],
  [D, 4, 0.5 , 1.5 ],
  [E, 4, 1   , 2.0 ],
  [C, 4, 0.5 , 3.0 ],
  [D, 4, 0.5 , 3.5 ],
  [B, 3, 0.75, 4.0 ],
  [A, 3, 0.25, 4.75],
  [B, 3, 0.25, 5.0 ]
]).map(parseNote);


// this is (currently) our musical instrument
function playFrequency(frequency, duration, position, gain) {
  position = position || 0;
  var oscillator = context.createOscillator();
  var compressor = context.createDynamicsCompressor();
  var damper = context.createWaveShaper();

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


  oscillator.noteOn(position);
  oscillator.noteOff(position + duration);
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
Canon.prototype.adjustGain = function(gainValue) {
  for(var k in this.voices) {
    this.voices[k].adjustGain(gainValue);
  }
};
Canon.prototype.getData = function() {
  var self = this;
  var voices = [], ret = [];
  var note, k;
  // addVoice is leaning on a bit of intentional scope leakage here
  // to know what 'k' is
  function addVoice(n) {
    var ret = n.concat(k, self.voices[k]);
    ret.voice = self.voices[k];
    return ret;
  }
  for(k in this.voices) {
    voice = this.voices[k].getData().map(addVoice);
    voices.push(voice);
  }
  return ret.concat.apply(ret,voices);
};

// the "voice" is the core component of the canon: canons
// are composed of several voices.
// voices all belong to a canon, and have a transform function
// applied to them, as well as a delay to account for when they
// come in
function Voice(canon, delay, transform) {
  this._loop = canon.loop;
  this.delay = delay === undefined ? 0 : delay;
  this.setTransform(transform);
  this.gain = context.createGain();
}
Voice.prototype.setTransform = function(transform) {
  // not sure we need this caching, but just in case we do...
  this._transform = transform;
  if(transform instanceof Function) {
    this.loop = this._loop.map(transform);
  } else {
    this.loop = this._loop.slice(); // clone array
  }
};
Voice.prototype.play = function(startTime, repetitions) {
  this.startTime = startTime;
  repetitions = repetitions === undefined ? 1 : repetitions;
  var time = startTime + this.delay * wholeNote;
  var loop = this.loop;    // note: this is the TRANSFORMED loop
  for(var j=0;j<repetitions;++j) {
    for(var i=0,l=loop.length;i<l;++i) {
      playFrequency(loop[i][0], loop[i][1] * wholeNote, loop[i][2] * wholeNote + time, this.gain);
    }
  }
};
Voice.prototype.adjustGain = function(gainValue) {
  this.gain.gain.value = gainValue;
};
Voice.prototype.getData = function() {
  // this will eventually (probably) take a range and
  // output something more complicated than the loop
  var delay = this.delay;
  return this.loop.map(function (note) {
    return [note[0], note[1], note[2] + delay];
  });
};

// this *returns* a transform function
function shiftPitch(steps) {
  return function(note) {
    return [ note[0] * Math.pow(2, (steps/12)) ].concat(note.slice(1));
  };
}

var BWV1074_Canon_1 = new Canon(BWV1074);
BWV1074_Canon_1.addVoice('G', 0  , shiftPitch(7));
BWV1074_Canon_1.addVoice('C', 0.5);
BWV1074_Canon_1.addVoice('A', 1  , shiftPitch(-3));
BWV1074_Canon_1.addVoice('D', 1.5, shiftPitch(-10));

BWV1074_Canon_1.adjustGain(0.2);

var playButton = document.getElementById('play');
play.addEventListener('click', function() {
  BWV1074_Canon_1.play(1);
});

// visual bits
var interactive = d3.select('#interactive')
  .attr('height', 400)
  .attr('width', 600);

// these domains are total guesses...
var xScale = d3.scale.linear()
  .domain([0, 7])
  .range([20, 580]);

var yScale = d3.scale.log()
  .base(2)
  .domain([-25, 5].map(ntf))
  .range([380, 20]);

var notes = interactive.selectAll('.note')
  .data(BWV1074_Canon_1.getData().sort(function(a, b) {
    return a[1] <= b[1]; // duration
  }));

var colors = {
  'G' : '#2368A0',
  'C' : '#B13631',
  'A' : '#8A6318',
  'D' : '#337331'
};

notes.enter()
  .append('svg:rect')
  .attr('class', 'note')
  .attr('x', function(d) { return xScale(d[2]); })
  .attr('y', function(d) { return yScale(d[0]); })
  .attr('height', yScale(ntf(0)) - yScale(ntf(1)))
  .attr('width', function(d) { return xScale(d[1]) - xScale(0); })
  .attr('fill', function(d) {
    return colors[d[3]];
  })
  .on('mouseenter', function(d) {
    BWV1074_Canon_1.adjustGain(0.5);
    d.voice.adjustGain(1);
    notes.attr('opacity', function(dPrime) {
      return dPrime[3] === d[3] ? 1 : 0.25;
    });
  })
  .on('mouseleave', function(d) {
    BWV1074_Canon_1.adjustGain(0.5);
    notes.attr('opacity', 1);
  });

