// src/components/library/LibraryBackground3D.jsx
import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function LibraryBackground3D() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- Scene, Camera, Renderer ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020617, 0.18);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 1.5, 7);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x020617, 1);
    container.appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const dir = new THREE.DirectionalLight(0x88ccff, 1.2);
    dir.position.set(3, 5, 2);
    scene.add(dir);

    const backLight = new THREE.PointLight(0xff66cc, 0.8, 20);
    backLight.position.set(-4, -2, -5);
    scene.add(backLight);

    // Floating Books
    const books = [];
    const bookGeo = new THREE.BoxGeometry(0.35, 0.9, 0.12);

    const palette = [
      0x38bdf8,
      0xa855f7,
      0xf97316,
      0x22c55e,
      0xfacc15,
      0x6366f1,
    ];

    const group = new THREE.Group();
    scene.add(group);

    const bookCount = 40;
    for (let i = 0; i < bookCount; i++) {
      const color = palette[i % palette.length];
      const material = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.3,
        roughness: 0.35,
        emissive: color,
        emissiveIntensity: 0.18,
      });

      const mesh = new THREE.Mesh(bookGeo, material);

      const radius = 3 + Math.random() * 3;
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * 4;

      mesh.position.set(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );

      mesh.rotation.set(
        Math.random() * 0.8 - 0.4,
        Math.random() * Math.PI * 2,
        Math.random() * 0.6 - 0.3
      );

      mesh.userData = {
        floatOffset: Math.random() * Math.PI * 2,
        floatSpeed: 0.4 + Math.random() * 0.5,
        baseY: mesh.position.y,
      };

      group.add(mesh);
      books.push(mesh);
    }

    // Background Wireframe Plane
    const planeGeo = new THREE.PlaneGeometry(40, 40, 40, 40);
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      wireframe: true,
      opacity: 0.15,
      transparent: true,
    });

    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -3;
    scene.add(plane);

    // Animation Loop
    const clock = new THREE.Clock();
    let frameId;

    const animate = () => {
      const t = clock.getElapsedTime();

      group.rotation.y = t * 0.04;

      books.forEach((b) => {
        const { floatOffset, floatSpeed, baseY } = b.userData;
        b.position.y = baseY + Math.sin(t * floatSpeed + floatOffset) * 0.25;
        b.rotation.x += 0.002;
        b.rotation.z += 0.0015;
      });

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      const { clientWidth, clientHeight } = container;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);

      container.removeChild(renderer.domElement);
      renderer.dispose();
      group.clear();
      scene.clear();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 -z-10 pointer-events-none"
      style={{ filter: "saturate(1.2)" }}
    />
  );
}
