/**
 * Public API barrel — re-exports everything from the layered api/ directory.
 * Import shared types, validated reads, and contact submission from here.
 *
 * Preferred usage going forward:
 *   import { fetchAbout } from '../api/portfolioService';
 *   import { postContact } from '../api/contactService';
 *   import { ApiError } from '../api/client';
 */
export * from './types';
export * from './schemas';
export * from './client';
export * from './portfolioService';
export * from './contactService';
