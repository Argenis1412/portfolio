/**
 * Public API barrel — re-exports everything from the layered api/ directory.
 * Import from this file to get full backwards compatibility.
 *
 * Preferred usage going forward:
 *   import { fetchAbout } from '../api/portfolioService';
 *   import { postChaosDrain } from '../api/chaosService';
 *   import { ApiError } from '../api/client';
 */
export * from './types';
export * from './schemas';
export * from './client';
export * from './portfolioService';
export * from './chaosService';
