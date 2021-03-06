// Gifly - an animated GIF performance tool for mobile.
// scroll up/down: move forward / backward
// touch and hold to freeze
// swipe left: set / clear cue in
// swip right: set / clear cue out

window.Gifly = function() {
    var instance = null;
    var gif = null;
    var canvas = null;
    var ctx = null;
    var imgData = null;

    var ctxBuf = null;
    var ctxBuf8 = null;
    var ctxBuf32 = null;

    var loadCb = null;

    var reader = null;
    var curFrame = 0;

    var frames = [];

    var playing = false;

    function Gifly() {
    }

    // Our default fps when animating
    Gifly.fps = 60;

    Gifly.init = function(canvasElt) {
        canvas = canvasElt;
        ctx = canvas.getContext("2d");
    };

    Gifly.load = function(url, cb) {
        var oReq = new XMLHttpRequest();
        oReq.open("GET", url, true);
        oReq.responseType = "arraybuffer";
        oReq.onload = process;
        oReq.onerror = processError;

        loadCb = cb;

        oReq.send(null);
    };

    Gifly.play = function() {
        playing = true;
        limitLoop(animate);
    };

    Gifly.stop = function() {
        playing = false;
    };

    Gifly.reset = function() {
        curFrame = 0;
        Gifly.stop();
    };

    Gifly.playing = function() {
        return playing;
    };

    Gifly.currentFrame = function() {
        return curFrame;
    };

    Gifly.exportFrame = function(idx) {
        if (idx === undefined) {
            idx = curFrame;
        }
        var cvs = document.createElement("canvas");        
        cvs.width = reader.width;
        cvs.height = reader.height;
        var ctx = cvs.getContext("2d");
        var imgData = ctx.getImageData(0,0, cvs.width, cvs.height);
        imgData.data.set(frames[idx]);
        ctx.putImageData(imgData, 0, 0);
        return cvs.toDataURL("image/png");
    };

    var process = function(oEvent) {
        var arrayBuffer = oEvent.currentTarget.response; // Note: not oReq.responseText
        if (arrayBuffer) {
            decode(new Uint8ClampedArray(arrayBuffer));
        }

        if (loadCb) { loadCb(); }
    };

    var processError = function(oEvent) {
        console.log(arguments);
    };

    // Private functions
    var decode = function(buf) {
        console.log("Decoding gif");
        reader = new GifReader(buf);

        canvas.width = reader.width;
        canvas.height = reader.height;

        Gifly.numFrames = reader.numFrames();

        imgData = ctx.getImageData(0,0,reader.width, reader.height);

        for(var i = 0; i < Gifly.numFrames; i++) {
            var ab = new ArrayBuffer(imgData.data.length);
            frames[i] = new Uint8ClampedArray(ab);
            reader.decodeAndBlitFrameRGBA(i, frames[i]);
        }

        console.log("Decoded " + reader.numFrames() + " frames");
    };

    var drawFrame = function(idx) {
        idx %= reader.numFrames();
        if (idx < 0) { idx = reader.numFrames() + idx; }
        if (curFrame == idx) { return; }

        imgData.data.set(frames[idx]);
        ctx.putImageData(imgData, 0, 0);
        curFrame = idx;
    };

    Gifly.drawFrame = drawFrame;
 
    var animate = function() {
        var start = Date.now();
        var i = curFrame;
        drawFrame(++i);
    };


    var limitLoop = function (fn) {
 
        // Use var then = Date.now(); if you
        // don't care about targetting < IE9
        var then = Date.now();
          
        return (function loop(time){
            if (playing) {
                requestAnimationFrame(loop);
            }
     
            // again, Date.now() if it's available
            var now = Date.now();
            var delta = now - then;
            var interval = 1000 / Gifly.fps;

            if (delta > interval) {
                // Update time
                // now - (delta % interval) is an improvement over just 
                // using then = now, which can end up lowering overall fps
                then = now - (delta % interval);
     
                // call the fn
                fn();
            }
        }(0));
    };

    // LZW-compress a string
    var lzw_encode = function(s) {
        var dict = {};
        var data = (s + "").split("");
        var out = [];
        var currChar;
        var phrase = data[0];
        var code = 256;
        for (var i=1; i<data.length; i++) {
            currChar=data[i];
            if (dict[phrase + currChar] !== null) {
                phrase += currChar;
            }
            else {
                out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
                dict[phrase + currChar] = code;
                code++;
                phrase=currChar;
            }
        }
        out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
        for (i=0; i<out.length; i++) {
            out[i] = String.fromCharCode(out[i]);
        }
        return out.join("");
    };

    // Decompress an LZW-encoded string
    var lzw_decode = function(s) {
        var dict = {};
        var data = (s + "").split("");
        var currChar = data[0];
        var oldPhrase = currChar;
        var out = [currChar];
        var code = 256;
        var phrase;
        for (var i=1; i<data.length; i++) {
            var currCode = data[i].charCodeAt(0);
            if (currCode < 256) {
                phrase = data[i];
            }
            else {
               phrase = dict[currCode] ? dict[currCode] : (oldPhrase + currChar);
            }
            out.push(phrase);
            currChar = phrase.charAt(0);
            dict[code] = oldPhrase + currChar;
            code++;
            oldPhrase = phrase;
        }
        return out.join("");
    };

    return Gifly;
}();