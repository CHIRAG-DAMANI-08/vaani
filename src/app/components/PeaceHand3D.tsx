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

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0, 4.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    // Studio Lighting for high-definition normal map ridges
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
    scene.add(ambientLight);

    // Key Light at oblique angle to accentuate normal map surface texture
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(4, 5, 4.5);
    scene.add(keyLight);

    // Secondary fill light
    const fillLight = new THREE.DirectionalLight(0xffffff, 1.5);
    fillLight.position.set(-5, -2, 3);
    scene.add(fillLight);

    // Strong Top/Back Rim Light for silhouette edge illumination
    const rimLight = new THREE.DirectionalLight(0xffffff, 2.5);
    rimLight.position.set(0, 6, -3.5);
    scene.add(rimLight);

    // Front Point Light for specular bounce on the ring and clay
    const pointLight = new THREE.PointLight(0xffffff, 2.2, 12);
    pointLight.position.set(1.5, 1.5, 3.5);
    scene.add(pointLight);

    // Texture Loader with correct ColorSpace & flipY for normal maps
    const textureLoader = new THREE.TextureLoader();
    
    const normalMap = textureLoader.load("/3d/o-1024-normal.webp");
    normalMap.flipY = false;
    normalMap.colorSpace = THREE.NoColorSpace;

    const roughnessMap = textureLoader.load("/3d/o-1024-roughness.webp");
    roughnessMap.flipY = false;
    roughnessMap.colorSpace = THREE.NoColorSpace;

    const ringNormalMap = textureLoader.load("/3d/o-512-ring-normal.webp");
    ringNormalMap.flipY = false;
    ringNormalMap.colorSpace = THREE.NoColorSpace;

    let model: THREE.Group | null = null;
    let currentScale = 0;
    const targetScale = 3.1; // Substantially larger hand to match Clayboan hero
    // Flip 180 degrees: -90 degrees (-Math.PI / 2) around Y
    const baseRotationY = -Math.PI / 2;
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

        // Apply clay material & enhanced normal textures
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            const matName = (mesh.name || "").toLowerCase();
            if (matName.includes("ring")) {
              mesh.material = new THREE.MeshStandardMaterial({
                color: 0x111111,
                roughness: 0.12,
                metalness: 0.95,
                normalMap: ringNormalMap,
                normalScale: new THREE.Vector2(2.0, 2.0),
              });
            } else {
              mesh.material = new THREE.MeshStandardMaterial({
                color: 0xf2f2f2,
                roughness: 0.58,
                metalness: 0.03,
                normalMap: normalMap,
                normalScale: new THREE.Vector2(2.8, 2.8),
                roughnessMap: roughnessMap,
              });
            }
          }
        });

        // Center model geometry
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        model.position.y -= 0.12;
        model.rotation.y = baseRotationY;
        model.scale.setScalar(0); // Start from 0 for slow scale-up entrance animation

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
      const normX = e.clientX / window.innerWidth - 0.5;
      const normY = e.clientY / window.innerHeight - 0.5;

      // Inverted rotation: moving mouse right rotates hand to the left
      targetRotation.y = -normX * 0.65;
      targetRotation.x = -normY * 0.45;

      // Inverted subtle position shift
      targetPos.x = -normX * 0.22;
      targetPos.y = normY * 0.18;

      onCoordsChange?.({
        x: Math.round(e.clientX),
        y: Math.round(e.clientY),
      });
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // Render loop with slow, smooth scale entrance and damping
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (model) {
        // Slow, organic entrance scale from 0 to full size
        if (currentScale < targetScale) {
          currentScale += (targetScale - currentScale) * 0.018;
          model.scale.setScalar(currentScale);
        }

        // Damping / Spring interpolation
        currentRotation.x += (targetRotation.x - currentRotation.x) * 0.05;
        currentRotation.y += (targetRotation.y - currentRotation.y) * 0.05;
        currentPos.x += (targetPos.x - currentPos.x) * 0.05;
        currentPos.y += (targetPos.y - currentPos.y) * 0.05;

        model.rotation.x = currentRotation.x;
        model.rotation.y = baseRotationY + currentRotation.y;
        model.position.x = currentPos.x;
        model.position.y = -0.12 + currentPos.y;
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
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="relative w-[340px] sm:w-[540px] md:w-[740px] aspect-[4/3] drop-shadow-[0_25px_45px_rgba(0,0,0,0.9)]">
          <Image
            src="/hand-peace-404.png"
            alt="Clay Peace Hand 404"
            fill
            sizes="(max-width: 768px) 100vw, 740px"
            priority
            className="object-contain filter contrast-[1.08] brightness-[0.98]"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none">
      {/* 3D WebGL Canvas mount */}
      <div ref={mountRef} className="w-full h-full pointer-events-auto cursor-grab active:cursor-grabbing" />
    </div>
  );
}
