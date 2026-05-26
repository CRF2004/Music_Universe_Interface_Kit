import Ecctrl from 'ecctrl';

export default function PlayerController() {
  return (
    <Ecctrl
      name="player"
      position={[0, 2, 0]} 
      debug={false}
      animated={false}
      maxVelLimit={5}
      jumpVel={4}
      floatHeight={0.3}
      characterInitDir={0}
      autoBalance={true}
      sprintMult={1.5}
      disableFollowCam={true}
    >
      <group position={[0, -0.65, 0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.3, 0.7, 4, 8]} />
          <meshStandardMaterial color="#ff3b2f" />
        </mesh>
        {/* Direction indicator (Face) */}
        <mesh position={[0, 0.5, 0.2]}>
          <boxGeometry args={[0.4, 0.1, 0.1]} />
          <meshStandardMaterial color="white" />
        </mesh>
      </group>
    </Ecctrl>
  );
}
