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
        requestAnimationFrame(animate);
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

    process = function(oEvent) {
        var arrayBuffer = oEvent.currentTarget.response; // Note: not oReq.responseText
        if (arrayBuffer) {
            decode(new Uint8ClampedArray(arrayBuffer));
        }

        if (loadCb) { loadCb(); }
    };

    processError = function(oEvent) {
        console.log(arguments);
    };

    // Private functions
    decode = function(buf) {
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

    drawFrame = function(idx) {
        idx %= reader.numFrames();
        if (idx < 0) { idx = reader.numFrames() + idx; }
        if (curFrame == idx) { return; }

        imgData.data.set(frames[idx]);
        ctx.putImageData(imgData, 0, 0);
        curFrame = idx;
    };

    Gifly.drawFrame = drawFrame;
 
    animate = function() {
        var i = curFrame;
        drawFrame(++i);
        if (playing) {
            requestAnimationFrame(animate);
        }
    };

    // LZW-compress a string
    lzw_encode = function(s) {
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
    lzw_decode = function(s) {
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