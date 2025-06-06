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
        position: [0.5, 0.5, 4],
        scale: [0.5, 0.5, 0.5],
        color: '#ef4444',
        name: 'Red Cube'
      },
      {
        id: 'blue-cube',
        type: 'cube',
        position: [-0.5, 0.5, 4],
        scale: [0.5, 0.5, 0.5],
        color: '#3b82f6',
        name: 'Blue Cube'
      }
    ]
  }
]; 