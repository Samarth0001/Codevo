/**
 * Utility functions for cookie configuration
 */

export interface CookieOptions {
  expires?: Date;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
//   domain?: string;
}

/**
 * Get cookie options based on environment
 * @param isRemembered - Whether the user chose to be remembered
 * @returns Cookie options object
 */
export const getCookieOptions = (isRemembered: boolean = false): CookieOptions => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // For local development, never use secure cookies
  // For production, use secure cookies
  const useSecure = isProduction;
  
  return {
    expires: isRemembered 
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
    httpOnly: true,
    secure: useSecure, // Only use secure cookies in production
    // sameSite: isProduction ? 'none' : 'lax', // 'none' for cross-origin in production, 'lax' for development
    sameSite: 'none',
    // domain: isProduction ? '.codevo.live' : undefined, // Set domain for production
  };
};

/**
 * Get cookie options for clearing cookies (same as setting but without expires)
 * @returns Cookie options object for clearing
 */
export const getClearCookieOptions = (): Omit<CookieOptions, 'expires'> => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // For local development, never use secure cookies
  // For production, use secure cookies
  const useSecure = isProduction;
  
  return {
    httpOnly: true,
    secure: useSecure, // Only use secure cookies in production
    // sameSite: isProduction ? 'none' : 'lax',
    sameSite: 'none',
    // domain: isProduction ? '.codevo.live' : undefined,
  };
};
