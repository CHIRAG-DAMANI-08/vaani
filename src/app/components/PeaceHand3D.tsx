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

    let isDisposed = false;

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
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 4.4);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);

    // Studio Grazing Lighting to strongly reveal normal map sculpt depth
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    // Grazing Key Light from top-right
    const grazingKey = new THREE.DirectionalLight(0xffffff, 3.8);
    grazingKey.position.set(5, 5, 3.5);
    scene.add(grazingKey);

    // Side Fill Light from left
    const sideFill = new THREE.DirectionalLight(0xffffff, 2.2);
    sideFill.position.set(-5, 2, 2.5);
    scene.add(sideFill);

    // Front soft light
    const frontFill = new THREE.DirectionalLight(0xffffff, 1.2);
    frontFill.position.set(0, 0, 5);
    scene.add(frontFill);

    // Sharp top-back rim light
    const rimLight = new THREE.DirectionalLight(0xffffff, 3.0);
    rimLight.position.set(0, 6, -3.5);
    scene.add(rimLight);

    let model: THREE.Group | null = null;
    let currentScale = 0;
    // Balanced scale so the entire hand cleanly fits the viewport
    const targetScale = 1.95;
    // Flipped 180 degrees: -90 degrees (-Math.PI / 2) around Y
    const baseRotationY = -Math.PI / 2;
    const targetRotation = { x: 0, y: 0, z: 0 };
    const currentRotation = { x: 0, y: 0, z: 0 };
    const targetPos = { x: 0, y: 0 };
    const currentPos = { x: 0, y: 0 };

    async function loadAssets() {
      try {
        const textureLoader = new THREE.TextureLoader();

        // Load all normal and roughness textures in parallel
        const [normalMap, roughnessMap, ringNormalMap] = await Promise.all([
          textureLoader.loadAsync("/3d/o-1024-normal.webp"),
          textureLoader.loadAsync("/3d/o-1024-roughness.webp"),
          textureLoader.loadAsync("/3d/o-512-ring-normal.webp"),
        ]);

        if (isDisposed) return;

        // Texture configuration for normal mapping
        normalMap.flipY = false;
        normalMap.colorSpace = THREE.NoColorSpace;
        normalMap.generateMipmaps = true;
        normalMap.minFilter = THREE.LinearMipmapLinearFilter;
        normalMap.magFilter = THREE.LinearFilter;
        normalMap.needsUpdate = true;

        roughnessMap.flipY = false;
        roughnessMap.colorSpace = THREE.NoColorSpace;
        roughnessMap.generateMipmaps = true;
        roughnessMap.needsUpdate = true;

        ringNormalMap.flipY = false;
        ringNormalMap.colorSpace = THREE.NoColorSpace;
        ringNormalMap.generateMipmaps = true;
        ringNormalMap.needsUpdate = true;

        // GLTF & Draco Loader
        const loader = new GLTFLoader();
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath("/draco/gltf/");
        loader.setDRACOLoader(dracoLoader);

        loader.load(
          "/3d/o-hand.glb",
          (gltf) => {
            if (isDisposed) return;
            model = gltf.scene;

            // Apply textures and compute vertex tangents for accurate normal map displacement
            model.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                mesh.castShadow = true;
                mesh.receiveShadow = true;

                // Explicitly compute vertex tangents on the Draco-decoded geometry
                try {
                  if (typeof (mesh.geometry as any).computeTangents === "function") {
                    (mesh.geometry as any).computeTangents();
                  }
                } catch (e) {
                  console.warn("Notice: Tangents already present or non-tangent geometry", e);
                }

                const matName = (mesh.name || "").toLowerCase();
                if (matName.includes("ring")) {
                  mesh.material = new THREE.MeshStandardMaterial({
                    color: 0x141414,
                    roughness: 0.12,
                    metalness: 0.96,
                    normalMap: ringNormalMap,
                    normalScale: new THREE.Vector2(2.5, 2.5),
                  });
                } else {
                  // Hand mesh: Emoji_lowUV
                  mesh.material = new THREE.MeshStandardMaterial({
                    color: 0xf5f5f5,
                    roughness: 0.52,
                    metalness: 0.02,
                    normalMap: normalMap,
                    normalScale: new THREE.Vector2(3.5, 3.5),
                    roughnessMap: roughnessMap,
                  });
                }
                mesh.material.needsUpdate = true;
              }
            });

            // Center model geometry
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.sub(center);
            model.position.y -= 0.08;
            model.rotation.y = baseRotationY;
            model.scale.setScalar(0); // Start from 0 for slow scale-up entrance

            scene.add(model);
            setLoaded(true);
          },
          undefined,
          (error) => {
            console.warn("Could not load 3D GLB hand, using fallback rendering:", error);
            setWebGlSupported(false);
          }
        );
      } catch (err) {
        console.warn("Failed to load textures/3d:", err);
        setWebGlSupported(false);
      }
    }

    loadAssets();

    // Mouse movement handler with expressive angle in every direction
    const handleMouseMove = (e: MouseEvent) => {
      const normX = e.clientX / window.innerWidth - 0.5;
      const normY = e.clientY / window.innerHeight - 0.5;

      // Inverted rotation: wide angles across yaw, pitch, and roll
      targetRotation.y = -normX * 1.55;
      targetRotation.x = -normY * 1.35;
      targetRotation.z = -normX * 0.35;

      // Inverted position shift
      targetPos.x = -normX * 0.42;
      targetPos.y = normY * 0.32;

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
          currentScale += (targetScale - currentScale) * 0.016;
          model.scale.setScalar(currentScale);
        }

        // Damping / Spring interpolation across all axes
        currentRotation.x += (targetRotation.x - currentRotation.x) * 0.055;
        currentRotation.y += (targetRotation.y - currentRotation.y) * 0.055;
        currentRotation.z += (targetRotation.z - currentRotation.z) * 0.055;
        currentPos.x += (targetPos.x - currentPos.x) * 0.055;
        currentPos.y += (targetPos.y - currentPos.y) * 0.055;

        model.rotation.x = currentRotation.x;
        model.rotation.y = baseRotationY + currentRotation.y;
        model.rotation.z = currentRotation.z;
        model.position.x = currentPos.x;
        model.position.y = -0.08 + currentPos.y;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      isDisposed = true;
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
        <div className="relative w-[300px] sm:w-[460px] md:w-[600px] aspect-[4/3] drop-shadow-[0_25px_45px_rgba(0,0,0,0.9)]">
          <Image
            src="/hand-peace-404.png"
            alt="Clay Peace Hand 404"
            fill
            sizes="(max-width: 768px) 100vw, 600px"
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
