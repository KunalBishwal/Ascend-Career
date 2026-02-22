import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment, RoundedBox, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

function ResumePaper() {
    const meshRef = useRef<THREE.Mesh>(null);
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
            groupRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.5) * 0.1;
        }
    });

    return (
        <group ref={groupRef}>
            <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
                {/* Main Paper Body */}
                <RoundedBox
                    args={[2.2, 3, 0.05]}
                    radius={0.05}
                    smoothness={4}
                >
                    <meshStandardMaterial
                        color="#ffffff"
                        metalness={0.1}
                        roughness={0.8}
                        emissive="#8b5cf6"
                        emissiveIntensity={0.05}
                    />
                </RoundedBox>

                {/* Header Lines */}
                <mesh position={[-0.6, 1.1, 0.03]}>
                    <planeGeometry args={[0.8, 0.1]} />
                    <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={0.5} />
                </mesh>
                <mesh position={[0.4, 1.1, 0.03]}>
                    <planeGeometry args={[0.4, 0.1]} />
                    <meshStandardMaterial color="#e2e8f0" />
                </mesh>

                {/* Content Lines - Section 1 */}
                {[0.7, 0.5, 0.3].map((y, i) => (
                    <mesh key={`s1-${i}`} position={[0, y, 0.03]}>
                        <planeGeometry args={[1.6, 0.05]} />
                        <meshStandardMaterial color={i === 0 ? "#6366f1" : "#e2e8f0"} />
                    </mesh>
                ))}

                {/* Content Lines - Section 2 */}
                {[-0.1, -0.3, -0.5, -0.7].map((y, i) => (
                    <mesh key={`s2-${i}`} position={[0, y, 0.03]}>
                        <planeGeometry args={[1.6, 0.05]} />
                        <meshStandardMaterial color="#e2e8f0" />
                    </mesh>
                ))}

                {/* Skills Tags Placeholder */}
                <mesh position={[-0.4, -1.1, 0.03]}>
                    <planeGeometry args={[0.5, 0.15]} />
                    <meshStandardMaterial color="#8b5cf6" opacity={0.6} transparent />
                </mesh>
                <mesh position={[0.4, -1.1, 0.03]}>
                    <planeGeometry args={[0.5, 0.15]} />
                    <meshStandardMaterial color="#3b82f6" opacity={0.6} transparent />
                </mesh>
            </Float>
        </group>
    );
}

interface ResumeVisualProps {
    className?: string;
}

export function ResumeVisual({ className }: ResumeVisualProps) {
    return (
        <div className={className}>
            <Canvas camera={{ position: [0, 0, 6], fov: 35 }}>
                <ambientLight intensity={0.8} />
                <pointLight position={[10, 10, 10]} intensity={1.5} color="#8b5cf6" />
                <pointLight position={[-10, -10, -10]} intensity={1} color="#3b82f6" />
                <spotLight position={[0, 5, 5]} angle={0.15} penumbra={1} intensity={2} castShadow />

                <Suspense fallback={null}>
                    <ResumePaper />
                    <Environment preset="night" />
                </Suspense>
            </Canvas>
        </div>
    );
}
