export type FractalType =
  | 'mandelbrot'
  | 'julia'
  | 'burningShip'
  | 'burningShipJulia'
  | 'mandelbar'
  | 'newton'
  | 'pheonix'
  | 'cubicMandelbrot'
  | 'sineJulia'
  | 'expJulia'
  | 'barnsleyFern';

export interface ColorSettings {
  huePhase: number;
  colorSpeed: number;
  saturation: number;
  animateHue: boolean;
}

export const fractalTypeToValue = {
  'mandelbrot': 0,
  'julia': 1,
  'burningShip': 2,
  'burningShipJulia': 9,
  'mandelbar': 3,
  'newton': 4,
  'pheonix': 5,
  'cubicMandelbrot': 6,
  'sineJulia': 7,
  'expJulia': 8,
  'barnsleyFern': 10
}; 