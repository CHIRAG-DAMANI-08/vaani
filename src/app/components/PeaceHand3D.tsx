"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.6);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.5);
    mainLight.position.set(3, 4, 5);
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 1.2);
    fillLight.position.set(-4, -2, 3);
    scene.add(fillLight);

    const topRimLight = new THREE.DirectionalLight(0xffffff, 1.5);
    topRimLight.position.set(0, 5, -3);
    scene.add(topRimLight);

    // Texture Loader with flipY: false for GLTF compatibility
    const textureLoader = new THREE.TextureLoader();
    
    const normalMap = textureLoader.load("/3d/o-1024-normal.webp");
    normalMap.flipY = false;

    const roughnessMap = textureLoader.load("/3d/o-1024-roughness.webp");
    roughnessMap.flipY = false;

    const ringNormalMap = textureLoader.load("/3d/o-512-ring-normal.webp");
    ringNormalMap.flipY = false;

    let model: THREE.Group | null = null;
    let currentScale = 0;
    const targetScale = 1.35;
    const targetRotation = { x: 0, y: 0 };
    const currentRotation = { x: 0, y: 0 };
    const targetPos = { x: 0, y: 0 };
    const currentPos = { x: 0, y: 0 };

    // GLTF Loader with DRACOLoader configuration
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/draco/gltf/");
    loader.setDRACOLoader(dracoLoader);

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

            const matName = (mesh.name || "").toLowerCase();
            if (matName.includes("ring")) {
              mesh.material = new THREE.MeshStandardMaterial({
                color: 0x141414,
                roughness: 0.12,
                metalness: 0.96,
                normalMap: ringNormalMap,
                normalScale: new THREE.Vector2(1.2, 1.2),
              });
            } else {
              mesh.material = new THREE.MeshStandardMaterial({
                color: 0xf5f5f5,
                roughness: 0.62,
                metalness: 0.04,
                normalMap: normalMap,
                normalScale: new THREE.Vector2(1.5, 1.5),
                roughnessMap: roughnessMap,
              });
            }
          }
        });

        // Center model geometry
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        model.position.y -= 0.15;
        model.scale.setScalar(0); // Start from 0 for entrance scale animation

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
      targetRotation.y = -normX * 0.75;
      targetRotation.x = -normY * 0.55;

      // Inverted subtle position shift
      targetPos.x = -normX * 0.25;
      targetPos.y = normY * 0.2;

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

    // Render loop with smooth scale entrance and damping
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (model) {
        // Entrance scale from 0 to full size
        if (currentScale < targetScale) {
          currentScale += (targetScale - currentScale) * 0.045;
          model.scale.setScalar(currentScale);
        }

        // Damping / Spring interpolation
        currentRotation.x += (targetRotation.x - currentRotation.x) * 0.06;
        currentRotation.y += (targetRotation.y - currentRotation.y) * 0.06;
        currentPos.x += (targetPos.x - currentPos.x) * 0.06;
        currentPos.y += (targetPos.y - currentPos.y) * 0.06;

        model.rotation.x = currentRotation.x;
        model.rotation.y = currentRotation.y;
        model.position.x = currentPos.x;
        model.position.y = -0.15 + currentPos.y;
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
      <div className="relative w-[340px] sm:w-[460px] md:w-[560px] aspect-[2/3] drop-shadow-[0_25px_45px_rgba(0,0,0,0.9)] flex items-center justify-center">
        <Image
          src="/hand-peace-404.png"
          alt="Clay Peace Hand 404"
          fill
          sizes="(max-width: 768px) 100vw, 560px"
          priority
          className="object-contain filter contrast-[1.08] brightness-[0.98]"
        />
      </div>
    );
  }

  return (
    <div className="relative w-[340px] sm:w-[480px] md:w-[620px] h-[360px] sm:h-[480px] md:h-[560px] flex items-center justify-center">
      {/* 3D WebGL Canvas mount */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
    </div>
  );
}
