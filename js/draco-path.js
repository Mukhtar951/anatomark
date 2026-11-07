/* Draco decoder location. Compressed models need the Draco decoder. A-Frame fetches it from
   gstatic by default (needs internet). If you put the decoder files in /libs/draco/
   (draco_decoder.js, draco_wasm_wrapper.js, draco_decoder.wasm) they are used instead,
   so compressed models also work offline. Load this right after A-Frame. */
(function () {
  var local = "../libs/draco/";
  var ok = false;
  try {
    var x = new XMLHttpRequest();
    x.open("HEAD", local + "draco_wasm_wrapper.js", false);
    x.send();
    ok = x.status === 200 && /javascript/i.test(x.getResponseHeader("Content-Type") || "");
  } catch (e) {}
  if (!ok || !window.AFRAME || !AFRAME.THREE || !AFRAME.THREE.DRACOLoader) return;
  var proto = AFRAME.THREE.DRACOLoader.prototype, orig = proto.setDecoderPath;
  proto.setDecoderPath = function () { return orig.call(this, local); };
})();
