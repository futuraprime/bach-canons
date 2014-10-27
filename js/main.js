// prototype code for the bach canons work
var AudioContext = window.AudioContext || window.webkitAudioContext;
var context = new AudioContext();

var wholeNote = 0.75;

// steps is steps from A4
function ntf(steps) {
  return 440 * Math.pow(2, (steps/12));
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
  for(var k in this.voices) {
    this.voices[k].play();
  }
};

// the "voice" is the core component of the canon: canons
// are composed of several voices.
// voices all belong to a canon, and have a transform function
// applied to them, as well as a delay to account for when they
// come in
function Voice(canon, transform, delay) {
  this.loop = canon.loop;
  this.transform = transform;
}
Voice.prototype.play = function() {

};
