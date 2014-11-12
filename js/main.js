// prototype code for the bach canons work
var AudioContext = window.AudioContext || window.webkitAudioContext;
var context = new AudioContext();

var wholeNote = 1.5;

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

// this can actually take inputs in three ways...
// it can take note, octave, duration, position
// or it can take frequency, duration, position
// or it can take an array of the form:
//            [note, octave, duration, position]
function Note(note, octave, duration, position) {
  if(note instanceof Array) {
    position = note[3];
    duration = note[2];
    octave = note[1];
    note = note[0];
  }
  if(arguments.length === 3) {
    this.frequency = note;
    position = duration;
    duration = octave;
  } else {
    this.frequency = note * Math.pow(2, octave - 4);
  }
  this.duration = duration;
  this.position = position;
}
Note.prototype.getData = function(delay) {
  delay = delay === undefined ? 0 : delay;
  return [this.frequency, this.duration, this.position + delay];
};




// this is (currently) our musical instrument
function playFrequency(frequency, duration, position, gain) {
  // console.log('playing frequency', frequency, duration, position);
  position = position || 0;
  var oscillator = context.createOscillator();
  var compressor = context.createDynamicsCompressor();
  var damper = context.createWaveShaper();

  gain = gain || context.createGain();
  oscillator.frequency.value = frequency;
  compressor.attack.value = 0.01;
  var n = 65536;
  var curve = new Float32Array(n), i;
  for (i=0; i<(n/2); i++)
    curve[i] = 0.05;
  for (i=(n/2); i<n; i++)
      curve[i] = Math.pow(i/(n/2), 2) - 1;
  damper.curve = curve;

  oscillator.connect(compressor);
  compressor.connect(damper);
  damper.connect(gain);
  gain.connect(context.destination);

  oscillator.start(position);
  oscillator.stop(position + duration);
}


function Theme(noteArray) {
  this.loop = noteArray.map(function(note) {
    return new Note(note);
  });
  this.theme = new Voice(this, null, null, null);
  this.canons = {};
}
Theme.prototype.addCanon = function(name, canonArray) {
  var i, j;
  this.canons[name] = new Canon(this.loop);
  for(i=0,l=canonArray.length;i<l;++i) {
    this.canons[name].addVoice.apply(this.canons[name], canonArray[i]);
  }
};
Theme.prototype.getCanon = function(canonName) {
  if(!this.canons[canonName]) { throw 'Canon ' + canonName + ' does not exist.'; }
  return this.canons[canonName];
};
Theme.prototype.setCurrentCanon = function(name) {
  if(!this.canons[name]) { throw 'Canon ' + name + ' does not exist.'; }
  this.currentCanon = this.canons[name];
};
Theme.prototype.getData = function(canonName) {
  if(!this.canons[canonName]) { throw 'Canon ' + canonName + ' does not exist.'; }
  return this.canons[canonName].getData();
};
Theme.prototype.play = function(canonName, repetitions) {
  if(!this.canons[canonName]) { 
    // no canon, play the theme alone
    return this.theme.play(context.currentTime + 0.1);
  }

  return this.canons[canonName].play(repetitions);
};




function Canon(loop) {
  if(loop instanceof Theme) {
    this.loop = loop.loop;
  } else {
    this.loop = loop;
  }
  this.voices = {};
}
Canon.prototype.addVoice = function(name, transform, delay, color) {
  console.log('adding voice to canon', arguments);
  var newVoice = new Voice(this, transform, delay, color);
  this.voices[name] = newVoice;
  return newVoice;
};
Canon.prototype.removeVoice = function(name) {
  delete this.voices[name];
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
function Voice(canon, delay, transform, color) {
  this._loop = canon.loop;
  this.delay = delay === undefined ? 0 : delay;
  this.setTransform(transform);
  this.gain = context.createGain();
  this.gain.gain.value = 0.5;
  if(color) { this.color = color; }
}
// the repetition factor determines how many times the transformed loop
// needs to be played in a 'single' loop. This can be less than one, which
// could cause problems
Voice.prototype.setTransform = function(transform, repetitionFactor) {
  if(transform) { this._transform = transform; }
  if(transform instanceof Function) {
    this.loop = this._loop.map(transform);
  } else {
    this.loop = this._loop.slice(); // clone array
  }
  var l = this.loop.length - 1;
  this.repetitionFactor = repetitionFactor || this.repetitionFactor || 1;
  this.duration = this.loop[l].duration + this.loop[l].position; // the end of the last note
};
Voice.prototype.setDelay = function(delay) {
  this.delay = delay === undefined ? 0 : delay;
  this.setTransform();
};
Voice.prototype.play = function(startTime, repetitions) {
  this.startTime = startTime;
  repetitions = repetitions === undefined ? 1 : repetitions;
  var time = startTime + this.delay * wholeNote;
  var loop = this.loop;    // note: this is the TRANSFORMED loop
  for(var j=0;j<repetitions * this.repetitionFactor;++j) {
    for(var i=0,l=loop.length;i<l;++i) {
      playFrequency(loop[i].frequency, loop[i].duration * wholeNote, (loop[i].position + j * this.duration) * wholeNote + time, this.gain);
    }
  }
};
Voice.prototype.adjustGain = function(gainValue) {
  this.gain.gain.value = gainValue;
};
Voice.prototype.getData = function() {
  var self = this;
  // this will eventually (probably) take a range and
  // output something more complicated than the loop
  var delay = this.delay || 0;
  return this.loop.map(function (note) { 
    return note.getData(delay);
  });
};

// this *returns* a transform function
function shiftPitch(steps) {
  return function(note) {
    // return [ note[0] * Math.pow(2, (steps/12)) ].concat(note.slice(1));
    return new Note(note.frequency * Math.pow(2, steps/12), note.duration, note.position);
  };
}




var BWV1074_notes = ([
  [C, 4, 0.5 , 0.0 ],
  [F, 4, 1   , 0.5 ],
  [D, 4, 0.5 , 1.5 ],
  [E, 4, 1   , 2.0 ],
  [C, 4, 0.5 , 3.0 ],
  [D, 4, 0.5 , 3.5 ],
  [B, 3, 0.75, 4.0 ],
  [A, 3, 0.25, 4.75],
  [B, 3, 0.25, 5.0 ]
]);

var BWV1074 = new Theme(BWV1074_notes);
BWV1074.addCanon('walther', [
  ['G', 0  ,   shiftPitch(7), '#2368A0'],
  ['C', 0.5,            null, '#B13631'],
  ['A', 1  ,  shiftPitch(-3), '#8A6318'],
  ['D', 1.5, shiftPitch(-10), '#337331']
]);




var stateMachine = new machina.Fsm({
  initialize : function() {
    var self = this;
    var playButton = document.getElementById('play');
    play.addEventListener('click', function() {
      self.handle('play');
    });
  },
  initialState : 'theme',
  states : {
    'theme' : {
      play : function() {
        BWV1074.play();
      }
    },
    'walther' : {
      play : function() {
        BWV1074.play('walther');
      }
    },
    'marpurg' : {
      play : function() {
        BWV1074.play('marpurg');
      }
    }
  }
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
  .data(BWV1074.getData('walther').sort(function(a, b) {
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
    return d[4].color;
  })
  .on('mouseenter', function(d) {
    BWV1074.getCanon('walther').adjustGain(0.1);
    d.voice.adjustGain(0.4);
    notes.attr('opacity', function(dPrime) {
      return dPrime[3] === d[3] ? 1 : 0.25;
    });
  })
  .on('mouseleave', function(d) {
    BWV1074.getCanon('walther').adjustGain(0.3);
    notes.attr('opacity', 1);
  });

