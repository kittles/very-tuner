/* global ImageData */
require("./lib/autoCurry.js")();
require("./lib/trim.js")();
require("./lib/docReady.js")();
var compose = require("./lib/compose.js");
var Q = require("q");
var getUserMedia = require("getusermedia"); 
var audioStream;
var AudioContext = window.AudioContext || window.webkitAudioContext;
var ctx = new AudioContext();
var cvsCtx;
var source;
var cvs;
var dataArray;
var fftSize = 2048;
var analyser = ctx.createAnalyser();
var processor;
var lastBuffer = null;
var imgData;

window.docReady(init);

function init () {

    getAudio(audioHandler)
    //makeOsc()
    .then(initProcessor)
    .then(initCanvas)
    .then(showSamples)
    .catch(function () {
        // load error page
    })
    .done(function () {
        // heh
    });
}

////////////////////////////////////////////////////////////////////////////////


function prop (property, object) {
    return object[property];
}
function setProp (property, object, value) {
    object[property] = value;
    return object;
}
function connectToNode (dest, node) {
    node.connect(dest);
    return node;
}
function connectFromNode (from, node) {
    from.connect(node);
    return node;
}
function makeDataArray (analyserNode) {
    return new Uint8Array(analyserNode.frequencyBinCount);
}
function getMedia (opts, handler) {
    var response = Q.defer();
    getUserMedia(opts,  handler.bind(null, response));
    return response.promise;
}


// pitch names and numbers

// jscs:disable
var noteNames = {
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
};
// jscs:enable

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


// script node

function initProcessor () {
    console.log("init processor");
    processor = ctx.createScriptProcessor(4096 / 4, 1, 1);
    processor.onaudioprocess = onaudioprocess;
    source.connect(processor);
    processor.connect(ctx.destination);
}
function onaudioprocess (e) {
    lastBuffer = e.inputBuffer;
}


// canvas drawing

function isModEq (n, x, idx) {
    return idx % n === 0;
}
function everyNth (n, xs) {
    return xs.filter(isModEq.ac()(n), xs);
}

function initCanvas () {
    cvs = document.getElementById("cvs");
    cvsCtx = cvs.getContext("2d");
    imgData = cvsCtx.createImageData(440, 440);
}
function showSamples () {
    if (lastBuffer) {
        var data = lastBuffer.getChannelData(0);
        for (var i = 0; i < 50; i++) {
            var pxData = {
                r: 0,
                g: 0,
                b: 0,
                a: 255 * ((data[i] + 1) / 2)
            };
            setImgDataAtPoint(i, 10, pxData);
            setImgDataAtPoint(i, 11, pxData);
            setImgDataAtPoint(i, 12, pxData);
            setImgDataAtPoint(i, 13, pxData);
            setImgDataAtPoint(i, 14, pxData);
        }
        for (var i = 0; i < 100; i++) {
            if (i % 2 === 1) {
                continue;
            }
            var pxData = {
                r: 0,
                g: 0,
                b: 0,
                a: 255 * ((data[i] + 1) / 2)
            };
            setImgDataAtPoint(i / 2, 10 + 5, pxData);
            setImgDataAtPoint(i / 2, 11 + 5, pxData);
            setImgDataAtPoint(i / 2, 12 + 5, pxData);
            setImgDataAtPoint(i / 2, 13 + 5, pxData);
            setImgDataAtPoint(i / 2, 14 + 5, pxData);
        }
        cvsCtx.putImageData(imgData, 0, 0);
    }
    requestAnimationFrame(showSamples);
}
function setImgDataAtPoint (x, y, data) {
    // img data is a 1d array of 4 elements per px
    // determine where in the array it is
    var idx = (x * 4) + (y * 440 * 4);
    imgData.data[idx + 0] = data.r;
    imgData.data[idx + 1] = data.g;
    imgData.data[idx + 2] = data.b;
    imgData.data[idx + 3] = data.a;
}


// getting user audio stream

// for testing
function makeOsc () {
    var response = Q.defer();
    source = ctx.createOscillator();
    source.frequency.value = 430;
    source.start(0);
    window.source = source;
    response.resolve();
    return response.promise;
}

var mediaOpts = {
    video: false,
    audio: true
};

var getAudio = getMedia.ac()(mediaOpts);

var audioHandler = function audioHandler (response, err, stream) {
    if (!err) { 
        console.log("should be logging");
        audioStream = stream;
        source = ctx.createMediaStreamSource(audioStream);
        response.resolve();
    } else {
        console.error("couldn't get audio stream");
        response.reject();
    }
};
