/**
 * @talak-web3/analytics-engine - Analytics System for Web3 Applications
 * 
 * Provides analytics event tracking and sink interfaces for Web3 applications.
 * Supports custom analytics backends and event streaming.
 * 
 * @example
 * ```typescript
 * import { AnalyticsEvent, AnalyticsSink } from '@talak-web3/analytics-engine';
 * 
 * const event: AnalyticsEvent = {
 *   type: 'transaction',
 *   data: { hash: '0x123...' }
 * };
 * ```
 */

export {
  type AnalyticsEvent,
  type AnalyticsSink,
} from '@talak-web3/types';

