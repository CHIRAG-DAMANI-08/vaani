"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import Image from "next/image";

interface PeaceHand3DProps {
  onCoordsChange?: (coords: { x: number; y: number }) => void;
}

export function PeaceHand3D({ onCoordsChange }: PeaceHand3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [webGlSupported, setWebGlSupported] = useState(true);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check WebGL support
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) {
        setWebGlSupported(false);
        return;
      }
    } catch {
      setWebGlSupported(false);
      return;
    }

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 500;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 4.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.2);
    mainLight.position.set(3, 4, 5);
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 1.0);
    fillLight.position.set(-4, -2, 3);
    scene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 1.2);
    backLight.position.set(0, 5, -4);
    scene.add(backLight);

    // Texture Loader
    const textureLoader = new THREE.TextureLoader();
    const normalMap = textureLoader.load("/3d/o-1024-normal.webp");
    const roughnessMap = textureLoader.load("/3d/o-1024-roughness.webp");
    const ringNormalMap = textureLoader.load("/3d/o-512-ring-normal.webp");

    let model: THREE.Group | null = null;
    const targetRotation = { x: 0, y: 0 };
    const currentRotation = { x: 0, y: 0 };
    const targetPos = { x: 0, y: 0 };
    const currentPos = { x: 0, y: 0 };

    // GLTF Loader
    const loader = new GLTFLoader();
    loader.load(
      "/3d/o-hand.glb",
      (gltf) => {
        model = gltf.scene;

        // Apply clay material & textures
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            const matName = mesh.name.toLowerCase();
            if (matName.includes("ring")) {
              mesh.material = new THREE.MeshStandardMaterial({
                color: 0x111111,
                roughness: 0.2,
                metalness: 0.9,
                normalMap: ringNormalMap,
              });
            } else {
              mesh.material = new THREE.MeshStandardMaterial({
                color: 0xf5f5f5,
                roughness: 0.65,
                metalness: 0.05,
                normalMap: normalMap,
                roughnessMap: roughnessMap,
              });
            }
          }
        });

        // Center and scale model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        model.position.y -= 0.2; // Slight vertical adjustment
        model.scale.setScalar(1.4);

        scene.add(model);
        setLoaded(true);
      },
      undefined,
      (error) => {
        console.warn("Could not load 3D GLB hand, using fallback rendering:", error);
        setWebGlSupported(false);
      }
    );

    // Mouse movement handler (Inverted tracking)
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const normX = (e.clientX - rect.left) / rect.width - 0.5;
      const normY = (e.clientY - rect.top) / rect.height - 0.5;

      // Inverted rotation: moving mouse right rotates hand to the left
      targetRotation.y = -normX * 0.9;
      targetRotation.x = -normY * 0.6;

      // Inverted position shift
      targetPos.x = -normX * 0.35;
      targetPos.y = normY * 0.25;

      onCoordsChange?.({
        x: Math.round(e.clientX),
        y: Math.round(e.clientY),
      });
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // Render loop with smooth damping
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (model) {
        // Damping / Spring interpolation
        currentRotation.x += (targetRotation.x - currentRotation.x) * 0.07;
        currentRotation.y += (targetRotation.y - currentRotation.y) * 0.07;
        currentPos.x += (targetPos.x - currentPos.x) * 0.07;
        currentPos.y += (targetPos.y - currentPos.y) * 0.07;

        model.rotation.x = currentRotation.x;
        model.rotation.y = currentRotation.y;
        model.position.x = currentPos.x;
        model.position.y = -0.2 + currentPos.y;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [onCoordsChange]);

  if (!webGlSupported) {
    return (
      <div className="relative w-[300px] sm:w-[380px] md:w-[440px] aspect-[2/3] drop-shadow-[0_25px_45px_rgba(0,0,0,0.9)] flex items-center justify-center">
        <Image
          src="/hand-peace-404.png"
          alt="Clay Peace Hand 404"
          fill
          priority
          className="object-contain filter contrast-[1.08] brightness-[0.98]"
        />
      </div>
    );
  }

  return (
    <div className="relative w-[320px] sm:w-[420px] md:w-[480px] h-[400px] sm:h-[480px] md:h-[520px] flex items-center justify-center">
      {/* 3D WebGL Canvas mount */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Styled 404 Typography Overlay in Brutalist / Old-English Serif Style */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <h1 className="text-7xl sm:text-8xl md:text-9xl font-serif font-black tracking-tighter text-white/95 drop-shadow-[0_15px_30px_rgba(0,0,0,0.95)] flex items-center">
          <span className="font-serif italic mr-[-4px] text-white">4</span>
          <span className="font-sans font-extrabold text-white">0</span>
          <span className="font-sans font-extrabold text-white">4</span>
        </h1>
      </div>
    </div>
  );
}
