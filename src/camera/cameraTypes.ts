export type CameraMode =
  | 'explore'       // normal movement
  | 'interaction'   // focusing on selected object/NPC
  | 'cinematic'     // scripted moment
  | 'inspection'    // examining a product/object
  | 'ui-safe';      // less dramatic, easier for reading text

export interface CameraPreset {
  id: CameraMode
  fov: number
  distance: number
  height: number
  lookAtHeight: number
  followSharpness: number
  rotationSharpness: number
  shoulderOffset?: number
  barrelDistortion?: number
  cameraShake?: number
  followRotation?: boolean
  fixedHeading?: number
}
