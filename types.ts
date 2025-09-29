export interface ObjectPreset {
  name: string;
  mass: number; // kg
  diameter: number; // m
  cd: number;   // drag coefficient
}

export interface ChartDataPoint {
  time: number;
  velocity: number;
}

export enum ModalType {
    NONE,
    DIRECTIONS,
    DETAILS,
    ABOUT
}