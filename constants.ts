import { ObjectPreset } from './types';

export const GRAVITY = 9.8; // m/s^2
export const AIR_DENSITY = 1.225; // kg/m^3

export const OBJECT_PRESETS: ObjectPreset[] = [
  { name: 'Basketball', mass: 0.62, diameter: 0.24, cd: 0.47 },
  { name: 'Tennis ball', mass: 0.057, diameter: 0.067, cd: 0.55 },
  { name: 'Bowling ball', mass: 7.2, diameter: 0.21, cd: 0.4 },
];

export const INITIAL_HEIGHT = 169; // Default starting height in meters

export const INITIAL_OBJECT = OBJECT_PRESETS[0];