import { useEffect, useRef } from "react";
import * as THREE from "three";

const ATMO_VS = `varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const ATMO_FS = `varying vec3 vN;void main(){float i=pow(0.6-dot(vN,vec3(0,0,1)),2.0);gl_FragColor=vec4(.35,.45,1.,1.)*i*1.4;}`;

function lerpAngle(current, target, t) {
  let delta = target - current;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  return current + delta * t;
}

function makeGlow() {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d").createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(129,140,248,1)"); g.addColorStop(0.2, "rgba(129,140,248,0.7)");
  g.addColorStop(0.5, "rgba(99,102,241,0.2)"); g.addColorStop(1, "rgba(99,102,241,0)");
  const ctx = c.getContext("2d"); ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export default function Globe({ coordinates, zoomTarget = 2.2, animTrigger = 0, resetTrigger = 0, onRotateDone, onZoomDone, onResetDone, visible = true }) {
  const mountRef = useRef(null);
  const sRef = useRef(null);
  const cbRef = useRef({});

  useEffect(() => { cbRef.current = { onRotateDone, onZoomDone, onResetDone }; });

  useEffect(() => {
    const el = mountRef.current; if (!el) return;
    const w = el.clientWidth, h = el.clientHeight;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
    camera.position.set(0, 0, 5);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(w, h); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    // Stars
    const sv = new Float32Array(2500 * 3);
    for (let i = 0; i < sv.length; i += 3) {
      const r = 40 + Math.random() * 60, t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1);
      sv[i] = r * Math.sin(p) * Math.cos(t); sv[i + 1] = r * Math.sin(p) * Math.sin(t); sv[i + 2] = r * Math.cos(p);
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(sv, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.5 })));

    // Earth — radius 2.5 for a larger globe
    const R = 2.5;
    const loader = new THREE.TextureLoader();
    const tex = loader.load("https://unpkg.com/three-globe/example/img/earth-night.jpg");
    tex.colorSpace = THREE.SRGBColorSpace;
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(R, 64, 64),
      new THREE.MeshPhongMaterial({ map: tex, emissiveMap: tex, emissive: new THREE.Color(0x112244), emissiveIntensity: 0.7, shininess: 15 })
    );
    scene.add(globe);

    // Atmosphere
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.12, 64, 64),
      new THREE.ShaderMaterial({ vertexShader: ATMO_VS, fragmentShader: ATMO_FS, blending: THREE.AdditiveBlending, side: THREE.BackSide, transparent: true })
    ));

    // Lights
    scene.add(new THREE.AmbientLight(0x333366, 3));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(5, 3, 5); scene.add(sun);

    // Pin marker — child of globe so it rotates with it
    const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeGlow(), transparent: true, depthWrite: false }));
    marker.scale.set(0.3, 0.3, 1); marker.visible = false;
    globe.add(marker);

    const s = { scene, camera, renderer, globe, marker, R, mode: "auto", targetX: 0, targetY: 0, zt: 2.2, frameId: 0 };
    sRef.current = s;

    function tick() {
      s.frameId = requestAnimationFrame(tick);
      const cb = cbRef.current;
      switch (s.mode) {
        case "auto":
          globe.rotation.y += 0.0015;
          break;
        case "rotating":
          globe.rotation.x = lerpAngle(globe.rotation.x, s.targetX, 0.04);
          globe.rotation.y = lerpAngle(globe.rotation.y, s.targetY, 0.04);
          if (Math.abs(lerpAngle(globe.rotation.x, s.targetX, 1) - globe.rotation.x) < 0.003 &&
              Math.abs(lerpAngle(globe.rotation.y, s.targetY, 1) - globe.rotation.y) < 0.003) {
            globe.rotation.x = s.targetX;
            globe.rotation.y = s.targetY;
            s.mode = "zooming"; cb.onRotateDone?.();
          }
          break;
        case "zooming":
          camera.position.z += (s.zt - camera.position.z) * 0.04;
          if (Math.abs(camera.position.z - s.zt) < 0.03) {
            camera.position.z = s.zt; s.mode = "settled"; cb.onZoomDone?.();
          }
          break;
        case "settled":
          if (marker.visible) {
            const p = 1 + 0.4 * Math.abs(Math.sin(Date.now() * 0.003));
            marker.scale.set(0.3 * p, 0.3 * p, 1);
          }
          globe.rotation.y += 0.0003;
          break;
        case "resetting":
          camera.position.z += (5 - camera.position.z) * 0.08;
          if (Math.abs(camera.position.z - 5) < 0.05) {
            camera.position.z = 5; s.mode = "auto"; marker.visible = false; cb.onResetDone?.();
          }
          break;
      }
      renderer.render(scene, camera);
    }
    tick();

    const onResize = () => {
      const nw = el.clientWidth, nh = el.clientHeight;
      camera.aspect = nw / nh; camera.updateProjectionMatrix(); renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); cancelAnimationFrame(s.frameId); renderer.dispose(); if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement); sRef.current = null; };
  }, []);

  /* ── Start animation — exact rotation formula ── */
  useEffect(() => {
    const s = sRef.current; if (!s || animTrigger === 0 || !coordinates) return;
    const { lat, lon } = coordinates;

    // Exact rotation: lon → Y rotation, lat → X rotation (negated)
    const targetRotY = (lon * Math.PI) / 180;
    const targetRotX = -(lat * Math.PI) / 180;

    // Normalize current Y to avoid multi-revolution lerp
    s.globe.rotation.y = s.globe.rotation.y % (Math.PI * 2);
    s.targetX = targetRotX;
    s.targetY = targetRotY;
    s.zt = zoomTarget;
    s.mode = "rotating";

    // Pin placement — must match rotation coordinate system
    const PIN_R = s.R * 1.01;
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = lon * (Math.PI / 180);
    s.marker.position.set(
      PIN_R * Math.sin(phi) * Math.sin(theta),
      PIN_R * Math.cos(phi),
      PIN_R * Math.sin(phi) * Math.cos(theta)
    );
    s.marker.visible = true;
  }, [animTrigger]);

  /* ── Reset ──────────────────────────────────── */
  useEffect(() => {
    const s = sRef.current; if (!s || resetTrigger === 0) return;
    s.mode = "resetting";
  }, [resetTrigger]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 z-0 transition-opacity duration-600 ease-in-out"
      style={{ opacity: visible ? 1 : 0 }}
    />
  );
}
