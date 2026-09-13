import { Mesh, Object3D } from 'three';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';

/** Index only immutable scenery. Character rigs retain Three's normal raycast. */
export function accelerateOccluders(objects:Object3D[]) {
  for(const object of objects)if(object instanceof Mesh){
    object.geometry.boundsTree ??= new MeshBVH(object.geometry);
    object.raycast=acceleratedRaycast;
  }
}
