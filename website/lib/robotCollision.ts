import * as THREE from 'three';
import { ScenarioObject } from './scenarios';

export interface RobotCollisionState {
  nearbyObjects: ScenarioObject[];
  canGrab: boolean;
  grabbedObject?: ScenarioObject;
}

export class RobotCollisionDetector {
  private grabDistance = 1.5; // Distance in which robot can grab objects
  private previousGripperPosition = new THREE.Vector3();
  
  constructor() {}
  
  // Calculate if robot gripper is close enough to any objects
  checkCollisions(
    gripperPosition: THREE.Vector3,
    objects: ScenarioObject[]
  ): RobotCollisionState {
    const nearbyObjects: ScenarioObject[] = [];
    let canGrab = false;
    
    objects.forEach(obj => {
      const objPosition = new THREE.Vector3(...obj.position);
      const distance = gripperPosition.distanceTo(objPosition);
      
      if (distance <= this.grabDistance) {
        nearbyObjects.push(obj);
        if (distance <= this.grabDistance * 0.7) { // Closer threshold for grabbing
          canGrab = true;
        }
      }
    });
    
    return {
      nearbyObjects,
      canGrab,
    };
  }
  
  // Get approximate gripper position from robot joint states
  calculateGripperPosition(jointStates: any[]): THREE.Vector3 {
    // This is a simplified calculation - in a real scenario you'd use forward kinematics
    // For now, we'll estimate based on typical robot arm configuration
    const baseRotation = jointStates.find(j => j.name.includes('rotation'))?.virtualDegrees || 0;
    const pitch = jointStates.find(j => j.name.includes('pitch'))?.virtualDegrees || 0;
    const elbow = jointStates.find(j => j.name.includes('elbow'))?.virtualDegrees || 0;
    
    // Simple forward kinematics approximation
    const baseRad = (baseRotation * Math.PI) / 180;
    const pitchRad = (pitch * Math.PI) / 180;
    const elbowRad = (elbow * Math.PI) / 180;
    
    // Estimated arm lengths (adjust based on actual robot)
    const upperArmLength = 2;
    const forearmLength = 1.5;
    
    const x = (upperArmLength * Math.cos(pitchRad) + forearmLength * Math.cos(pitchRad + elbowRad)) * Math.cos(baseRad);
    const y = upperArmLength * Math.sin(pitchRad) + forearmLength * Math.sin(pitchRad + elbowRad) + 1; // +1 for base height
    const z = (upperArmLength * Math.cos(pitchRad) + forearmLength * Math.cos(pitchRad + elbowRad)) * Math.sin(baseRad);
    
    return new THREE.Vector3(x, y, z);
  }
} 