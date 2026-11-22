import type {WardKey} from '../../types';

declare global {
  interface Window {
    __kyotoCabinetIds?: WardKey[];
  }
}
