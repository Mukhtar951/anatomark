OPTIONAL — makes the AR page work with NO internet (e.g. at a defense).

Put these files here (save from the links, keep the exact names):
  aframe.min.js     https://aframe.io/releases/1.5.0/aframe.min.js
  aframe-ar.js      https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/aframe/build/aframe-ar.js
  camera_para.dat   https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/data/data/camera_para.dat

The AR page uses these when they exist and falls back to the online copies when
they don't, so the site works either way. AR.js also fetches a marker pattern
file from the internet; send aframe-ar.js to be checked for its exact address.

OPTIONAL — Draco decoder for compressed models, so they work offline too.
Put these in libs/draco/ (from https://www.gstatic.com/draco/versioned/decoders/1.5.6/):
  draco_decoder.js   draco_wasm_wrapper.js   draco_decoder.wasm
Without them the decoder loads from the internet.
