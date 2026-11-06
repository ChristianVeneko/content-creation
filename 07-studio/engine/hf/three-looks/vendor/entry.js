// Entry of the vendored three.js bundle (global `T`): core + post passes + rounded boxes + a procedural room environment.
// No file loaders: the default composition builds every model from code. Rebuild with: node hf/three-looks/vendor/build.mjs
export * from "three";
export { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
export { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
export { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
export { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
export { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
export { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
export { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
