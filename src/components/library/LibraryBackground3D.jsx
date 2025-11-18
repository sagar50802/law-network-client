// 🚀 src/components/library/LibraryBackground3D.jsx
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

// ⭐ NEW – auto image loader
import { loadImageAuto } from "../../utils/loadImage";

export default function LibraryBackground3D() {
  const containerRef = useRef(null);

  // ⭐ Background image state
  const [bg, setBg] = useState("/backgrounds/bg1.png"); // fallback

  /* =========================================================================
     ⭐ LOAD BACKGROUND IMAGE (png/jpg/jpeg/webp automatically)
  ========================================================================= */
  useEffect(() => {
    async function loadBG() {
      const found = await loadImageAuto("/backgrounds/library-room");
      if (found) setBg(found);
    }
    loadBG();
  }, []);

  /* =========================================================================
     ⭐ THREE.JS BACKGROUND ANIMATION
  ========================================================================= */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    /* =====================================================
       🔧 CORE: Scene + Renderer + Camera
    ===================================================== */
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020617, 0.2);

    const width = container.clientWidth;
    const height = container.clientHeight;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 2, 9);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x020617, 1);
    container.appendChild(renderer.domElement);

    /* =====================================================
       🌟 BLOOM EFFECT
    ===================================================== */
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.7,
      0.4,
      0.1
    );
    composer.addPass(bloomPass);

    /* =====================================================
       💡 LIGHTING
    ===================================================== */
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const dirLight = new THREE.DirectionalLight(0x88ccff, 1.4);
    dirLight.position.set(4, 5, 3);
    scene.add(dirLight);

    const magentaGlow = new THREE.PointLight(0xff33aa, 1, 15);
    magentaGlow.position.set(-5, -1, -4);
    scene.add(magentaGlow);

    /* =====================================================
       📚 FLOATING BOOKS
    ===================================================== */
    const books = [];
    const group = new THREE.Group();
    scene.add(group);

    const bookGeo = new THREE.BoxGeometry(0.35, 0.9, 0.12);
    const palette = [0x38bdf8, 0xa855f7, 0xf97316, 0x22c55e, 0xfacc15, 0x6366f1];

    for (let i = 0; i < 45; i++) {
      const color = palette[i % palette.length];

      const mat = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.3,
        roughness: 0.3,
        emissive: color,
        emissiveIntensity: 0.35,
      });

      const mesh = new THREE.Mesh(bookGeo, mat);

      const angle = Math.random() * Math.PI * 2;
      const radius = 3 + Math.random() * 4;

      mesh.position.set(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 4,
        Math.sin(angle) * radius
      );

      mesh.userData = {
        angle,
        radius,
        floatOffset: Math.random() * Math.PI * 2,
        floatSpeed: 0.5 + Math.random() * 0.3,
        rotationSpeed: 0.005 + Math.random() * 0.003,
      };

      group.add(mesh);
      books.push(mesh);
    }

    /* =====================================================
       ✨ FLOATING PARTICLES
    ===================================================== */
    const particlesGeometry = new THREE.BufferGeometry();
    const particleCount = 600;
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 15;
    }

    particlesGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );

    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.04,
      transparent: true,
      opacity: 0.6,
      color: 0x88ccff,
    });

    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);

    /* =====================================================
       🖱 PARALLAX
    ===================================================== */
    const mouse = { x: 0, y: 0 };
    window.addEventListener("mousemove", (e) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    /* =====================================================
       🎥 ANIMATION LOOP
    ===================================================== */
    const clock = new THREE.Clock();

    const animate = () => {
      const t = clock.getElapsedTime();

      camera.position.x = Math.sin(t * 0.2) * 0.6;
      camera.position.y = 2 + Math.sin(t * 0.3) * 0.2;
      camera.lookAt(0, 0, 0);

      group.rotation.y += (mouse.x * 0.15 - group.rotation.y) * 0.02;

      books.forEach((b) => {
        b.userData.angle += 0.0015;
        b.position.x = Math.cos(b.userData.angle) * b.userData.radius;
        b.position.z = Math.sin(b.userData.angle) * b.userData.radius;

        b.position.y =
          Math.sin(t * b.userData.floatSpeed + b.userData.floatOffset) * 0.35;

        b.rotation.x += b.userData.rotationSpeed;
        b.rotation.y += b.userData.rotationSpeed * 0.6;
      });

      particles.rotation.y += 0.0003;

      composer.render();
      requestAnimationFrame(animate);
    };
    animate();

    /* =====================================================
       📱 RESIZE HANDLER
    ===================================================== */
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    /* =====================================================
       🧹 CLEANUP
    ===================================================== */
    return () => {
      window.removeEventListener("resize", handleResize);
      container.removeChild(renderer.domElement);
      renderer.dispose();
      scene.clear();
      group.clear();
    };
  }, []);

  /* =========================================================================
     ⭐ UI RETURN — BACKGROUND + 3D LAYER
  ========================================================================= */
  return (
    <>
      {/* ⭐ IMAGE BACKGROUND */}
      <div
        className="absolute inset-0 -z-20"
        style={{
          backgroundImage: `url(${bg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: 0.28,
        }}
      />

      {/* ⭐ THREE.JS LAYER */}
      <div
        ref={containerRef}
        className="absolute inset-0 -z-10 pointer-events-none"
      />
    </>
  );
}
