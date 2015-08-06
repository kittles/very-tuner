/* global ImageData */
require("./lib/analytics.js")();
require("./lib/autoCurry.js")();
require("./lib/trim.js")();
require("./lib/docReady.js")();
var compose = require("./lib/compose.js");
var getUserMedia = require("getusermedia");
var Q = require("q");

// constants
var SAMPLE_RATE = 44100;
var PROCESSOR_SAMPLES = Math.pow(2, 9);
var SAMPLE_MS = 1000 / SAMPLE_RATE;
var PITCHES = [
    "c-4",
    "d-4",
    "e-4",
    "f-4",
    "g-4",
    "a-4",
    "b-4"
];

var strobes = [];

// audio nodes
var AudioContext = window.AudioContext || window.webkitAudioContext;
var ctx = new AudioContext();
var source; // for the audio input
var gain = ctx.createGain();
gain.gain.value = 30;

window.docReady(function () {
    document.body.addEventListener("click", init);
    document.body.addEventListener("touchstart", init);
});

function init () {
    //makeOsc() // for testing
    getAudio(audioHandler)
    .then(connectSource)
    .then(initStrobes)
    .then(draw)
    .catch(function (e) {
        // load error page
        console.log("caught during init");
        throw(e);
    })
    .done(function () {
        // heh
    });
    document.body.removeEventListener("click", init);
    document.body.removeEventListener("touchstart", init);
}

////////////////////////////////////////////////////////////////////////////////

function hslToRgb (h, s, l) {
    var r, g, b;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        var hue2rgb = function hue2rgb (p, q, t) {
            if (t < 0) {
                t += 1;
            }
            if (t > 1) {
                t -= 1;
            }
            if (t < 1 / 6) {
                return p + (q - p) * 6 * t;
            }
            if (t < 1 / 2) {
                return q;
            }
            if (t < 2 / 3) {
                return p + (q - p) * (2 / 3 - t) * 6;
            }
            return p;
        };

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}


function Strobe (pitch, color, idx) {
    this.pitch = pitch;
    this.color = color;
    this.hz = noteHertz(pitch);
    this.period = 1 / this.hz;
    this.processor_samples = Math.ceil(SAMPLE_RATE * this.period); // number of samples that a period will fit in
    this.processor_buffer_size = Math.pow(2, 10);
    this.buffer = null;

    // canvas
    this.canvas = document.createElement("canvas");
    this.canvas.className = "strobe-canvas";
    this.canvasCtx = this.canvas.getContext("2d");
    this.canvas.width = this.processor_samples;
    this.canvas.height = 1;
    this.imgData = this.canvasCtx.createImageData(this.canvas.width, this.canvas.height);

    // audio nodes
    this.eq = ctx.createBiquadFilter();
    this.eq.type = "bandpass";
    this.eq.frequency.value = this.hz;
    this.eq.Q.value = 180;
    //this.compressor = ctx.createDynamicsCompressor();
    //this.compressor.threshold.value = -50;
    //this.compressor.knee.value = 40;
    //this.compressor.ratio.value = 12;
    //this.compressor.reduction.value = -20;
    //this.compressor.attack.value = 0;
    //this.compressor.release.value = 0.25;
    this.processor = ctx.createScriptProcessor(this.processor_buffer_size, 1, 1);
    this.processor.onaudioprocess = function onaudioprocess (e) {
        this.buffer = e.inputBuffer.getChannelData(0);
        this.buffer_created = currentMs();
        this.new_buffer = true;
    }.bind(this);
    gain.connect(this.eq);
    //this.eq.connect(this.compressor);
    //this.compressor.connect(this.processor);
    this.eq.connect(this.processor);
    this.processor.connect(ctx.destination);

    this.draw = function draw () {
        if (this.buffer) {
            // better version would step through the buffer if its the second
            // time drawing it etc
            var offset = Math.round(getStartTime(this.buffer_created, this.hz) / SAMPLE_MS);
            for (var i = offset; i < this.processor_samples + offset; i++) {
                var pxData = {
                    r: this.color.r,
                    g: this.color.g,
                    b: this.color.b,
                    a: 255 * normalizeAmplitude(this.buffer[i])
                };
                setImgDataAtPoint(this.imgData, i - offset, 0, pxData);
            }
            this.canvasCtx.putImageData(this.imgData, 0, 0);
        }
    }.bind(this);
}
function initStrobes () {
    strobes = PITCHES.map(function (pitch, idx, arr) {
        var hue = idx / arr.length;
        var color = hslToRgb(hue, 1, 0.5);
        return new Strobe(pitch, color, idx);
    });
    strobes.map(function (strobe) {
        var container = document.getElementById("strobes");
        container.appendChild(strobe.canvas);
    });
    window.strobes = strobes;
}


// pitch names and numbers

var noteNames = {
    //jscs:disable
    c  : 1,
    cs : 2,
    db : 2,
    d  : 3,
    ds : 4,
    eb : 4,
    e  : 5,
    f  : 6,
    fs : 7,
    gb : 7,
    g  : 8,
    gs : 9,
    ab : 9,
    a  : 10,
    as : 11,
    bb : 11,
    b  : 12
    //jscs:enable
};

var twelfthRootOfTwo = Math.pow(2, 1 / 12);

var halfStepsFromA = halfStepsBetween.ac()("a-4");

function noteToNumber (note) {
    var pitch = note.split("-")[0].toLowerCase();
    var octave = parseInt(note.split("-")[1]);
    return noteNames[pitch] + (12 * octave);
}
function halfStepsBetween (a, b) {
    return noteToNumber(b) - noteToNumber(a);
}
function noteHertz (note) {
    return 440.0 * Math.pow(twelfthRootOfTwo, halfStepsFromA(note));
}
function currentMs () {
    return ctx.currentTime * 1000;
}
function connectNodes () {
    var nodes = Array.prototype.slice.call(arguments);
    for (var i = 0; i < nodes.length - 1; i++) {
        nodes[i].connect(nodes[i + 1]);
    }
}
function isModEq (n, x, idx) {
    return idx % n === 0;
}
function everyNth (n, xs) {
    return xs.filter(isModEq.ac()(n), xs);
}
function fmod (a, b) {
    return (a - (Math.floor(a / b) * b));
}
function getStartTime (time, pitch) {
    var period = 1000 / pitch;
    var startTime = period;
    startTime -= fmod(time, period);
    return startTime;
}
function invoke (name, object) {
    object[name].call(object);
}
function draw () {
    strobes.map(function (strobe) {
        strobe.draw();
    });
    requestAnimationFrame(draw);
}
function setImgDataAtPoint (imgData, x, y, data) {
    // img data is a 1d array of 4 elements per px
    // since x and y correspond to 2d array, need to determine where in the array it is
    var idx = (x * 4) + (y * imgData.width * 4);
    imgData.data[idx + 0] = data.r;
    imgData.data[idx + 1] = data.g;
    imgData.data[idx + 2] = data.b;
    imgData.data[idx + 3] = data.a;
}
function normalizeAmplitude (x) {
    return x;
    //return (x + 1) / 2;
    //return Math.sqrt(x);
}

// getting user audio stream

// for testing
function makeOsc () {
    var response = Q.defer();
    source = ctx.createOscillator();
    source.frequency.value = 440;
    source.start(0);
    window.source = source;
    response.resolve();
    return response.promise;
}
function connectSource () {
    source.connect(gain);
}

function getMedia (opts, handler) {
    var response = Q.defer();
    getUserMedia(opts,  handler.bind(null, response));
    return response.promise;
}
var mediaOpts = {
    video: false,
    audio: true
};
var getAudio = getMedia.ac()(mediaOpts);

var audioHandler = function audioHandler (response, err, stream) {
    if (!err) {
        source = ctx.createMediaStreamSource(stream);
        response.resolve();
    } else {
        console.error("couldn't get audio stream");
        response.reject();
    }
};
