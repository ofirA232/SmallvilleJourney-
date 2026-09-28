import * as THREE from 'three';

/** Where a dancer's left arm points, in their own frame (+x to their left, +y up, +z the way they face):
 * `upper` from shoulder to elbow, `lower` from elbow to wrist. The right arm mirrors it. */
export interface ArmPose { upper: THREE.Vector3; lower: THREE.Vector3 }
/** A slow dance: his hands at her waist, her arms around his neck. */
export const HOLD_WAIST: ArmPose = { upper: new THREE.Vector3(.14, -.72, .68).normalize(), lower: new THREE.Vector3(-.45, -.05, .89).normalize() };
export const HOLD_NECK: ArmPose = { upper: new THREE.Vector3(.22, .25, .94).normalize(), lower: new THREE.Vector3(-.85, .28, .45).normalize() };

const body = new THREE.Quaternion(), joint = new THREE.Quaternion(), direction = new THREE.Vector3();
/** Lays an arm pose over an imported rig once its animation has run for the frame, so nothing adds up
 * from frame to frame. The rigs rest with their arms straight out to the sides, so each bone turns
 * from that line to the pose's direction, measured in the frame its parent has this frame. */
export function holdArms(character: THREE.Object3D, pose: ArmPose) {
  character.getWorldQuaternion(body);
  for (const [side, sign] of [['Left', 1], ['Right', -1]] as const) {
    const shoulder = character.getObjectByName(`${side}Arm`), elbow = character.getObjectByName(`${side}Forearm`);
    if (!shoulder?.parent || !elbow) continue;
    const rest = new THREE.Vector3(sign, 0, 0);
    for (const [bone, aim] of [[shoulder, pose.upper], [elbow, pose.lower]] as const) {
      bone.parent!.getWorldQuaternion(joint);
      direction.set(aim.x * sign, aim.y, aim.z).applyQuaternion(body).applyQuaternion(joint.invert());
      bone.quaternion.setFromUnitVectors(rest, direction);
      bone.updateMatrixWorld(true);
    }
  }
}
