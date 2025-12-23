// Default configuration
const isDevelopment = process.env.NODE_ENV === 'development';

const defaultConfig = {
  // API_URL: isDevelopment ? 'https://webapp-vote-server.onrender.com/api' : '/api',
  // SOCKET_URL: isDevelopment ? 'https://webapp-vote-server.onrender.com' : window.location.origin,
  // Add other default configurations here
  API_URL: 'https://webapp-vote-server.onrender.com/api',
  SOCKET_URL: 'https://webapp-vote-server.onrender.com'
};

// Runtime configuration that can be overridden by config.json
let runtimeConfig = { ...defaultConfig };

export async function loadConfig() {
  try {
    const res = await fetch('/config.json', { cache: 'no-store' });
    if (res.ok) {
      const config = await res.json();
      runtimeConfig = { 
        ...defaultConfig, 
        ...config,
        // Ensure SOCKET_URL is set correctly based on environment
        // SOCKET_URL: config.SOCKET_URL || (isDevelopment ? 'https://webapp-vote-server.onrender.com' : window.location.origin)
        SOCKET_URL: 'https://webapp-vote-server.onrender.com'
      };
    }
  } catch (error) {
    console.warn('Failed to load config.json, using default configuration', error);
  }
  
  // Store in global for easy access if needed
  window.__APP_CONFIG__ = runtimeConfig;
  return runtimeConfig;
}

// Export the current configuration
export const config = runtimeConfig;

const appConfig = {
  ...runtimeConfig,
  loadConfig
};

export default appConfig;