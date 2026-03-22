/**
 * Centralized API configuration
 * Provides consistent API base URL across the application
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

/**
 * Helper function to get the full API URL for an endpoint
 */
export function getApiUrl(endpoint: string): string {
  return `${API_BASE_URL}${endpoint}`;
}
