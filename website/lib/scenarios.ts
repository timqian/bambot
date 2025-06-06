export interface ScenarioObject {
  id: string;
  type: 'cube' | 'sphere' | 'cylinder';
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  color: string;
  name: string;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  objects: ScenarioObject[];
}

export const availableScenarios: Scenario[] = [
  {
    id: 'red-blue-cubes',
    title: 'Red and Blue Cubes',
    description: 'Two cubes placed in front of the robot for basic manipulation tasks',
    objects: [
      {
        id: 'red-cube',
        type: 'cube',
        position: [0.8, 0.3, 4],
        scale: [0.4, 0.4, 0.4],
        color: '#ef4444',
        name: 'Red Cube'
      },
      {
        id: 'blue-cube',
        type: 'cube',
        position: [-0.8, 0.3, 4],
        scale: [0.4, 0.4, 0.4],
        color: '#3b82f6',
        name: 'Blue Cube'
      }
    ]
  },
  {
    id: 'gripping-test',
    title: 'Gripping Test Scenario',
    description: 'Optimally positioned objects for testing robot gripping capabilities',
    objects: [
      {
        id: 'grip-cube-1',
        type: 'cube',
        position: [0, 0.3, 3.5],
        scale: [0.3, 0.3, 0.3],
        color: '#10b981',
        name: 'Green Test Cube'
      },
      {
        id: 'grip-cube-2',
        type: 'cube',
        position: [0.6, 0.3, 3.8],
        scale: [0.35, 0.35, 0.35],
        color: '#f59e0b',
        name: 'Orange Test Cube'
      },
      {
        id: 'grip-sphere',
        type: 'sphere',
        position: [-0.6, 0.3, 3.8],
        scale: [0.3, 0.3, 0.3],
        color: '#8b5cf6',
        name: 'Purple Test Sphere'
      }
    ]
  }
]; 