/**
 * IP Address Service for Stepquest
 * Captures the device's public IP address for security and regional analytics
 *
 * PRIVACY NOTE: IP addresses are used for:
 * - Security monitoring and fraud detection
 * - Regional analytics to understand user distribution
 * - Compliance with data residency requirements
 *
 * The service runs silently in the background without user interaction.
 */

// Cache for IP address to avoid excessive API calls
interface IPCache {
  ip: string;
  timestamp: number;
}

let ipCache: IPCache | null = null;

// Cache duration: 1 hour (IP addresses don't change frequently)
const CACHE_DURATION_MS = 60 * 60 * 1000;

/**
 * Fetches the public IP address from ipify.org
 * This is a reliable, free service that returns just the IP address
 *
 * @returns The public IP address as a string, or null if unavailable
 */
const fetchIPFromAPI = async (): Promise<string | null> => {
  try {
    // ipify.org is a simple, reliable service that returns just the IP
    const response = await fetch('https://api.ipify.org?format=json', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Short timeout to avoid blocking app startup
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.warn('IP service returned non-OK status:', response.status);
      return null;
    }

    const data = await response.json();

    if (data && typeof data.ip === 'string') {
      return data.ip;
    }

    console.warn('IP service returned unexpected format:', data);
    return null;
  } catch (error) {
    // Network errors, timeouts, etc. should not block the app
    if (error instanceof Error) {
      // Only log if it's not a timeout (timeouts are expected in poor network conditions)
      if (error.name !== 'AbortError' && error.name !== 'TimeoutError') {
        console.warn('Failed to fetch IP address:', error.message);
      }
    }
    return null;
  }
};

/**
 * Get the current public IP address
 * Uses cache to avoid excessive API calls
 *
 * @param forceRefresh If true, bypass cache and fetch fresh IP
 * @returns The public IP address, or null if unavailable
 */
export const getPublicIPAddress = async (forceRefresh = false): Promise<string | null> => {
  // Return cached IP if valid and not forcing refresh
  if (!forceRefresh && ipCache) {
    const now = Date.now();
    const cacheAge = now - ipCache.timestamp;

    if (cacheAge < CACHE_DURATION_MS) {
      console.log('🌐 Using cached IP address');
      return ipCache.ip;
    }
  }

  // Fetch fresh IP
  console.log('🌐 Fetching public IP address...');
  const ip = await fetchIPFromAPI();

  if (ip) {
    // Update cache
    ipCache = {
      ip,
      timestamp: Date.now(),
    };
    console.log('✅ IP address captured successfully');
  } else {
    console.log('⚠️  Could not capture IP address (network may be unavailable)');
  }

  return ip;
};

/**
 * Clear the IP cache
 * Useful for testing or when network conditions change
 */
export const clearIPCache = (): void => {
  ipCache = null;
};

/**
 * Initialize IP capture on app startup
 * This is a fire-and-forget operation that won't block the app
 *
 * @returns Promise that resolves with the IP or null
 */
export const initializeIPCapture = async (): Promise<string | null> => {
  try {
    const ip = await getPublicIPAddress();

    if (ip) {
      console.log('🌐 IP capture initialized:', {
        ipPrefix: ip.split('.').slice(0, 2).join('.') + '.xxx.xxx',
        hasIP: true,
      });
    }

    return ip;
  } catch (error) {
    console.warn('IP capture initialization failed:', error);
    return null;
  }
};
