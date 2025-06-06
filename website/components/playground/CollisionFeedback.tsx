import React from 'react';
import { RobotCollisionState } from '@/lib/robotCollision';

interface CollisionFeedbackProps {
  collisionState: RobotCollisionState;
}

export function CollisionFeedback({ collisionState }: CollisionFeedbackProps) {
  if (collisionState.nearbyObjects.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-5 right-5 bg-black bg-opacity-80 text-white p-3 rounded-lg z-50 text-sm">
      <h4 className="font-bold mb-2">Objects in Range</h4>
      {collisionState.nearbyObjects.map((obj) => (
        <div key={obj.id} className="flex items-center gap-2 mb-1">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: obj.color }}
          />
          <span>{obj.name}</span>
          {collisionState.canGrab && (
            <span className="text-green-400 text-xs">✓ Can grab</span>
          )}
        </div>
      ))}
      {collisionState.canGrab && (
        <div className="mt-2 text-green-400 text-xs">
          💡 Tip: Click on objects to interact with them!
        </div>
      )}
    </div>
  );
} 