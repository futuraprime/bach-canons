// prototype code for the bach canons work
var AudioContext = window.AudioContext || window.webkitAudioContext;
var context = new AudioContext();

var wholeNote = 1;

// these are the number of the key of these notes
// in the zeroth octave
// obviously, keys below 1 don't exist...
var NOTE_IDS = {};
var B  = NOTE_IDS.B  = 'B';
var Bb = NOTE_IDS.Bb = 'Bb';
var A  = NOTE_IDS.A  = 'A';
var Ab = NOTE_IDS.Ab = 'Ab';
var G  = NOTE_IDS.G  = 'G';
var Gb = NOTE_IDS.Gb = 'Gb';
var F  = NOTE_IDS.F  = 'F';
var E  = NOTE_IDS.E  = 'E';
var Eb = NOTE_IDS.Eb = 'Eb';
var D  = NOTE_IDS.D  = 'D';
var Db = NOTE_IDS.Db = 'Db';
var C  = NOTE_IDS.C  = 'C';

// mainly for debugging
function noteToString(note) {
  return _.invert(NOTE_IDS)[note];
}

// this is a function to let you wait for a dynamic list of promises
// but does NOT return the results of them to you in any fashion
// this still has the possibility of resolving early, if all of the
// async calls known to it wrap up before more are added. So not
// perfect. But it should generally work in our case.
function dynamicWhen(promises) {
  var dfd = $.Deferred();

  // we know the load will take more than 100ms, so we'll give it
  // a moment to get going...
  // yes, this is hacky.
  setTimeout(function() {
    var when = $.when.apply(this, promises);
    when.then(function() {
      dfd.resolve();
    });

    promises.push = function() {
      Array.prototype.push.apply(promises, arguments);
      when = $.when.apply(this, promises);
      when.then(function() {
        dfd.resolve();
      });
    };
  }, 1000);

  return dfd.promise();
}

var CHROMATIC = [C, Db, D, Eb, E, F, Gb, G, Ab, A, Bb, B];
var DIATONIC  = [C, D, E, F, G, A, B];

// so if you want a note from a number, you fetch it out of this array...
// NOTES[40], for example, will yield you [C, 4] and you can then push
// duration and position for it to make a new Note.
var NOTES = [                                                        [Ab, 0], [A, 0], [Bb, 0], [B, 0],
  [C, 1], [Db, 1], [D, 1], [Eb, 1], [E, 1], [F, 1], [Gb, 1], [G, 1], [Ab, 1], [A, 1], [Bb, 1], [B, 1],
  [C, 2], [Db, 2], [D, 2], [Eb, 2], [E, 2], [F, 2], [Gb, 2], [G, 2], [Ab, 2], [A, 2], [Bb, 2], [B, 2],
  [C, 3], [Db, 3], [D, 3], [Eb, 3], [E, 3], [F, 3], [Gb, 3], [G, 3], [Ab, 3], [A, 3], [Bb, 3], [B, 3],
  [C, 4], [Db, 4], [D, 4], [Eb, 4], [E, 4], [F, 4], [Gb, 4], [G, 4], [Ab, 4], [A, 4], [Bb, 4], [B, 4],
  [C, 5], [Db, 5], [D, 5], [Eb, 5], [E, 5], [F, 5], [Gb, 5], [G, 5], [Ab, 5], [A, 5], [Bb, 5], [B, 5],
  [C, 6], [Db, 6], [D, 6], [Eb, 6], [E, 6], [F, 6], [Gb, 6], [G, 6], [Ab, 6], [A, 6], [Bb, 6], [B, 6],
  [C, 7], [Db, 7], [D, 7], [Eb, 7], [E, 7], [F, 7], [Gb, 7], [G, 7], [Ab, 7], [A, 7], [Bb, 7], [B, 7],
  [C, 8]
];
var NOTE_STRINGS = NOTES.map(function(n) { return n.join(''); });
// incidentally, it has 89 entries, rather than 88, because piano keys
// are 1-indexed. Ab0 is not on a (normal) piano.

// this can actually take inputs in three ways...
// it can take note, octave, duration, position
// or it can take number, duration, position
// or it can take an array of the form:
//           [note, octave, duration, position]
function Note(note, octave, duration, position) {
  var number;
  if(note instanceof Array) {
    position = note[3];
    duration = note[2];
    octave = note[1];
    note = note[0];
  }
  if(arguments.length === 3) {
    // we have number...
    number = note;
    var noteIds = NOTES[note];
    position = arguments[2];
    duration = arguments[1];
    octave = noteIds[1];
    note = noteIds[0];
  } else {
    number = NOTE_STRINGS.indexOf([note, octave].join(''));
  }
  this.note = note;
  this.octave = octave;
  this.duration = duration;
  this.position = position;
  this.number = number;
  // note: this.buffers is an array on the prototype
  // we're using the prototype as a place to hold a global
  // cache of piano notes
  if(this.buffers[this.number]) {
    this.buffer = this.buffers[this.number];
  } else {
    this.getNote(this.number);
  }
}
Note.prototype.buffers = [];
Note.prototype.promises = [];
Note.prototype.when = null;
Note.prototype.getNote = function(number) {
  var dfd = $.Deferred();
  var self = this;
  var url = './keys/piano-ff-0' + (number < 10 ? '0' : '') + number.toString() + '.wav';
  var request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.responseType = 'arraybuffer';

  request.onload = function() {
    context.decodeAudioData(request.response, function(buffer) {
      self.buffer = self.buffers[number] = buffer;
      dfd.resolve(buffer);
    }, function(err) {
      dfd.reject();
    });
  };

  Note.prototype.promises.push(dfd.promise());
  if(!Note.prototype.when) {
    Note.prototype.when = dynamicWhen(Note.prototype.promises);
  }

  request.send();
  return dfd.promise();
};
Note.prototype.getData = function(delay) {
  delay = delay === undefined ? 0 : delay;
  return [this.number, this.duration, this.position + delay];
};
Note.prototype.play = function(startTime, gain) {
  var source = context.createBufferSource();
  startTime = startTime ? startTime : 0;
  source.buffer = this.buffer;
  source.connect(gain ? gain : context.destination);

  source.start(startTime + this.position);
};



function convertToNotes(noteArray) {
  var elapsedTime = 0;
  var outArray = [];
  for(var i=0,l=noteArray.length;i<l;++i) {
    outArray[i] = new Note(noteArray[i][0], noteArray[i][1], noteArray[i][2], elapsedTime);
    elapsedTime += noteArray[i][2];
  }
  return outArray;
}


function Theme(noteArray) {
  this.loop = convertToNotes(noteArray);
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
  if(!this.canons[canonName]) {
    // no canon, return the theme alone
    return this.theme;
  }
  return this.canons[canonName];
};
Theme.prototype.setCurrentCanon = function(name) {
  if(!this.canons[name]) { throw 'Canon ' + name + ' does not exist.'; }
  this.currentCanon = this.canons[name];
};
Theme.prototype.getData = function(canonName) {
  if(!this.canons[canonName]) {
    // no canon, return the theme alone
    return this.theme.getData();
  }
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
  var newVoice;
  // console.log('adding voice to canon', arguments);
  if(transform instanceof Voice) {
    // we're directly adding a created voice here...
    newVoice = transform;
  } else {
    newVoice = new Voice(this, delay, transform, color);
  }
  this.voices[name] = newVoice;
  return newVoice;
};
Canon.prototype.removeVoice = function(name) {
  delete this.voices[name];
};
Canon.prototype.play = function(repetitions) {
  var time = context.currentTime + 0.1;
  silenceVoices(); // stop other currently playing things
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
  // function addVoice(n) {
  //   var ret = n.concat(k, self.voices[k]);
  //   ret.voice = self.voices[k];
  //   return ret;
  // }
  for(k in this.voices) {
    // voice = this.voices[k].getData().map(addVoice);
    voices.push(this.voices[k].getData());
  }
  return ret.concat.apply(ret,voices);
};



// the "voice" is the core component of the canon: canons
// are composed of several voices.
// voices all belong to a canon, and have a transform function
// applied to them, as well as a delay to account for when they
// come in
function Voice(canon, delay, transform, color, options) {
  this.options = options || {};
  if(canon.hasOwnProperty('loop')) {
    this._loop = canon.loop;
  } else {
    // we assume the canon presented is a notearray.
    this._loop = convertToNotes(canon);
  }
  this.setTransform(transform);
  this.delay = delay === undefined ? 0 : delay;
  this.gain = context.createGain();
  this.gain.gain.value = 0.5;
  this.gain.connect(context.destination);
  if(color) { this.color = color; }
  this.voices.push(this);
}
Voice.prototype.voices = [];
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

  // we switch to a new gain node here, shutting off the old one to end
  // previous repetitions
  this.gain.gain.value = 0;
  this.gain = context.createGain();
  this.gain.gain.value = 0.5;
  this.gain.connect(context.destination);

  repetitions = repetitions === undefined ? 1 : repetitions;
  var time = startTime + this.delay * wholeNote;
  var loop = this.loop;    // note: this is the TRANSFORMED loop
  for(var j=0;j<repetitions * this.repetitionFactor;++j) {
    for(var i=0,l=loop.length;i<l;++i) {
      loop[i].play(startTime + j * this.duration + this.delay, this.gain);
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
  var dataLoop = this.loop.map(function (note) {
    var out = note.getData(delay);
    out[3] = self;
    return out;
  });
  return this.options.reverse ? dataLoop.reverse() : dataLoop;
};
function silenceVoices() {
  for(var i=0,l=Voice.prototype.voices.length;i<l;++i) {
    Voice.prototype.voices[i].adjustGain(0);
  }
}




function Transform() {
  this.functions = [];
}
// note: this shifts the pitch diatonically (?)
// if this is used on a note *not* on the diatonic scale it will crash
Transform.prototype.shiftByTones = function(tones) {
  this.functions.push(function(note) {
    var diatone = DIATONIC.indexOf(note.note), octave = note.octave;
    var newDiatone = (diatone + tones);

    // if we went off the top or bottom of the scale, we shift an octave appropriately
    var newOctave = octave + Math.floor(newDiatone / 7);

    // now we can flatten newDiatone to something the array can use...
    newDiatone = newDiatone % 7;
    if(newDiatone < 0) { newDiatone += 7; }
    return new Note(DIATONIC[newDiatone], newOctave, note.duration, note.position);
  });
  return this;
};
// this won't work...
Transform.prototype.shiftBySemitones = function(semitones) {
  this.functions.push(function(note) {
    return new Note(note.number + semitones, note.duration, note.position);
  });
  return this;};
Transform.prototype.invert = function(center) {
  this.functions.push(function(note) {
    return new Note(center / note.frequency * center, note.duration, note.position);
  });
  return this;
};
// fn breaks the chain and returns the transform function itself
Transform.prototype.fn = function() {
  var self = this;
  return function(note) {
    for (var i=0,l=self.functions.length;i<l;++i) {
      note = self.functions[i](note);
    }
    return note;
  };
};



var BWV1074_notes = ([
  [C, 4, 0.5  , 0.0   ],
  [F, 4, 1    , 0.5   ],
  [D, 4, 0.5  , 1.5   ],
  [E, 4, 1    , 2.0   ],
  [C, 4, 0.5  , 3.0   ],
  [D, 4, 0.5  , 3.5   ],
  [B, 3, 0.75 , 4.0   ],
  [A, 3, 0.125, 4.75  ],
  [B, 3, 0.125, 4.875 ]
]);

var blue   = '#2368A0';
var yellow = '#8A6318';
var red    = '#B13631';
var green  = '#337331';

var BWV1074 = new Theme(BWV1074_notes);



// visual bits
var interactive = d3.select('#interactive')
  .attr('height', 400)
  .attr('width', 600);

// these domains are total guesses...
var xScale = d3.scale.linear()
  .domain([0, 7])
  .range([20, 580]);

var yScale = d3.scale.linear()
  .domain([22, 55])
  .range([380, 20]);


function updateDisplay(canonName) {
  // we want all the voices to show up as transformations of the
  // theme, so we're going to cut out the old one...
  interactive.selectAll('.note')
    // lose the .note class so these don't get selected...
    .attr('class', 'removing')
    .transition()
    .duration(100)
    .style('opacity', '0')
    .delay(100)
    .remove();

  var notes = interactive.selectAll('.note');

  var noteData = notes.data(BWV1074.getData(canonName));

  var themeData = BWV1074.getData();
  var tL = themeData.length;

  // this should actually be a no-op, since we already removed all
  // of these, above
  // noteData.exit().remove();

  var voiceDelay = 500; // milliseconds

  noteData.enter()
    .append('svg:rect')
    .attr('class', 'note')
    .attr('x', function(d, i) { return xScale(themeData[i % tL][2]); })
    .attr('width', function(d, i) { return xScale(themeData[i % tL][1]) - xScale(0); })
    .attr('y', function(d, i) { return yScale(themeData[i % tL][0]); })
    .attr('height', yScale(38) - yScale(39))
    .style('opacity', 0);

  noteData
    // ok, now is time for some crazy fancy transitions...
    // first, we fade in the elements, still in their theme positions
    .transition().duration(100)
    .delay(function(d, idx) {
      return Math.floor(idx/tL) * voiceDelay;
    })
    .style('opacity', 1)


    // next, we move them horizontally, including any scaling that happens
    // in the horizontal direction
    .transition().duration(250)
    .delay(function(d, idx) {
      return 110 + Math.floor(idx/tL) * voiceDelay;
    })
    .style('fill', function(d) {
      return d[3].color;
    })
    .attr('x', function(d) { return xScale(d[2]); })
    .attr('width', function(d) { return xScale(d[1]) - xScale(0); })


    // finally, we move them up or down, and invert them if needed.
    .transition().duration(250).delay(function(d, idx) {
      return 370 + Math.floor(idx/tL) * voiceDelay;
    })
    .attr('y', function(d) { return yScale(d[0]); })
    .attr('height', yScale(38) - yScale(39));
}
