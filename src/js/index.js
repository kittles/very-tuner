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
    init();
    //document.body.addEventListener("click", init);
    //document.body.addEventListener("touchstart", init);
});

function init () {
    //makeOsc() // for testing
    getAudio(audioHandler)
    .then(connectSource)
    .then(initStrobes)
    .then(addInfo)
    .then(draw)
    .catch(function (e) {
        // load error page
        document.getElementById("error").style.display = "flex";
        throw(e);
    })
    .done(function () {
        // heh
    });
    //document.body.removeEventListener("click", init);
    //document.body.removeEventListener("touchstart", init);
}

////////////////////////////////////////////////////////////////////////////////


// set up nodes and audio stream

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


// strobe constructor

function Strobe (pitch, color, idx) {
    this.pitch = pitch;
    this.color = color;
    this.hz = noteHertz(pitch);
    this.period = 1 / this.hz;
    this.processor_samples = Math.ceil(SAMPLE_RATE * this.period); // number of samples that a period will fit in
    this.processor_buffer_size = Math.pow(2, 10);
    this.buffer = null;

    // container element
    this.container = document.createElement("div");
    this.container.className = "strobe-container";

    // text element
    this.letter = pitch.split("-")[0].toUpperCase();
    this.letterEl = document.createElement("div");
    this.letterEl.className = "letter";
    this.letterText = document.createTextNode(this.letter);
    this.letterEl.style.color = "rgb(" + this.color.r + ", " + this.color.g + ", " + this.color.b + ")";
    this.setOpacity = setOpacity.ac()(this.letterEl);

    // canvas
    this.canvas = document.createElement("canvas");
    this.canvas.className = "strobe-canvas";
    this.canvasCtx = this.canvas.getContext("2d");
    this.canvas.width = this.processor_samples;
    this.canvas.height = 1;
    this.imgData = this.canvasCtx.createImageData(this.canvas.width, this.canvas.height);

    this.container.appendChild(this.canvas);
    this.container.appendChild(this.letterEl);
    this.letterEl.appendChild(this.letterText);

    // audio nodes
    this.eq = ctx.createBiquadFilter();
    this.eq.type = "bandpass";
    this.eq.frequency.value = this.hz;
    this.eq.Q.value = 60;
    this.processor = ctx.createScriptProcessor(this.processor_buffer_size, 1, 1);
    this.processor.onaudioprocess = function onaudioprocess (e) {
        this.buffer = e.inputBuffer.getChannelData(0);
        this.buffer_created = currentMs();
        this.new_buffer = true;
    }.bind(this);
    gain.connect(this.eq);
    this.eq.connect(this.processor);
    this.processor.connect(ctx.destination);

    // replace draw method once intro is done
    this.draw = function drawIntro () {
        for (var i = 0; i < this.processor_samples; i++) {
            var pxData = {
                r: this.color.r,
                g: this.color.g,
                b: this.color.b,
                a: 255
            };
            setImgDataAtPoint(this.imgData, i, 0, pxData);
        }
        this.canvasCtx.putImageData(this.imgData, 0, 0);
        this.container.className += " trans-3 fade-in";
        setTimeout(fadeOut.bind(this), 300);
        function fadeOut () {
            this.container.className = this.container.className.replace("fade-in", "fade-out");
        }
        // dont draw for a bit while transition is happening
        this.draw = function () {
            return;
        };
        // when transition is done, replace with real draw function
        setTimeout(replaceDraw.bind(this), 700);
        function replaceDraw () {
            this.draw = draw;
            setTimeout(showContainer.bind(this), 200);
            function showContainer () {
                this.container.style.opacity = 1;
            }
        }
    }.bind(this);

    function draw () {
        if (this.buffer) {
            // better version would step through the buffer if its the second
            // time drawing it etc
            var opacity = 0;
            var offset = Math.round(getStartTime(this.buffer_created, this.hz) / SAMPLE_MS);
            for (var i = offset; i < this.processor_samples + offset; i++) {
                var value = normalizeAmplitude(this.buffer[i]);
                var pxData = {
                    r: this.color.r,
                    g: this.color.g,
                    b: this.color.b,
                    a: 255 * value
                };
                setImgDataAtPoint(this.imgData, i - offset, 0, pxData);
                opacity = Math.max(opacity, value);
            }
            this.canvasCtx.putImageData(this.imgData, 0, 0);
            this.setOpacity(opacity);
        }
    }
}
function initStrobes () {
    strobes = PITCHES.map(function (pitch, idx, arr) {
        var hue = idx / arr.length;
        var color = hslToRgb(hue, 1, 0.5);
        return new Strobe(pitch, color, idx);
    });
    var container = document.getElementById("strobes");
    strobes.map(function (strobe) {
        container.appendChild(strobe.container);
    });
    return Q.all(strobes.map(function (strobe, idx, arr) {
        var response = Q.defer();
        container.appendChild(strobe.container);
        setTimeout(function () {
            strobe.draw();
            response.resolve();
        }, idx * 100);
        return response.promise;
    }));
}
function addInfo () {
    var info = document.getElementsByClassName("info")[0];
    info.className += " fade-in no-top";
}


// note pitch and hz

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


// working with strobe buffers

function currentMs () {
    return ctx.currentTime * 1000;
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
function normalizeAmplitude (x) {
    return x;
    //return (x + 1) / 2;
    //return Math.sqrt(x);
}


// drawing

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
function setOpacity (el, opacity) {
    el.style.opacity = opacity;
}
