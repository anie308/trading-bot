import axios from 'axios';
import { GetKlineParamsV5, RestClientV5 } from 'bybit-api';

// Configuration
const CONFIG = {
  bybit: {
    testnet: false,
    baseUrl: {
      testnet: "https://api-testnet.bybit.com",
      mainnet: "https://api.bybit.com"
    },
    retryConfig: {
      maxRetries: 3,
      initialDelayMs: 1000,
      timeoutMs: 30000
    }
  }
};

// Custom axios instance with retry logic
const createAxiosInstance = () => {
  const instance = axios.create({
    timeout: CONFIG.bybit.retryConfig.timeoutMs,
    headers: {
      'Content-Type': 'application/json',
      'x-referer': 'bybitapinode'
    }
  });
  
  // Add request interceptor for logging
  instance.interceptors.request.use(request => {
    console.log(`Request to: ${request.url}`);
    return request;
  });
  
  // Add response interceptor for logging
  instance.interceptors.response.use(
    response => response,
    async error => {
      const { config } = error;
      
      // Create retry count if it doesn't exist
      config.retryCount = config.retryCount || 0;
      
      // Check if we should retry
      if (config.retryCount < CONFIG.bybit.retryConfig.maxRetries) {
        config.retryCount += 1;
        
        // Calculate delay with exponential backoff
        const delay = CONFIG.bybit.retryConfig.initialDelayMs * Math.pow(2, config.retryCount - 1);
        console.log(`Retrying request (${config.retryCount}/${CONFIG.bybit.retryConfig.maxRetries}) after ${delay}ms...`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        return instance(config);
      }
      
      return Promise.reject(error);
    }
  );
  
  return instance;
};

// Enhanced Bybit client with better error handling
class EnhancedBybitClient {
  client: RestClientV5;
  axios: any;
  constructor() {
    // Initialize the standard client
    this.client = new RestClientV5({
      testnet: CONFIG.bybit.testnet
    });
    
    // Create our custom axios instance
    this.axios = createAxiosInstance();
  }
  
  async fetchKlineData(params = {}) {
    const defaultParams = {
      category: "inverse",
      symbol: 'BTCUSD',
      interval: '60',
      start: Date.now() - (24 * 60 * 60 * 1000), // Default to last 24 hours
      end: Date.now()
    } as GetKlineParamsV5;
    
    const requestParams = { ...defaultParams, ...params };
    
    try {
      // First attempt with the standard client
      try {
        const response = await this.client.getKline(requestParams);
        return response;
      } catch (clientError) {
        console.warn('Standard client failed, falling back to custom implementation:', clientError.message);
        
        // Fall back to our custom implementation if the standard client fails
        const baseUrl = CONFIG.bybit.testnet 
          ? CONFIG.bybit.baseUrl.testnet 
          : CONFIG.bybit.baseUrl.mainnet;
          
        const response = await this.axios.get(`${baseUrl}/v5/market/kline`, {
          params: requestParams
        });
        
        return response.data;
      }
    } catch (error) {
      // Enhanced error reporting
      let errorDetails = {
        message: error.message,
        code: error.code || 'UNKNOWN',
        url: error.config?.url || 'Unknown URL',
        params: requestParams
      };
      
      console.error('Error fetching market data:', errorDetails);
      throw new Error(`Failed to fetch kline data: ${error.message}`);
    }
  }
  
  // Helper method to check API connectivity
  async checkConnectivity() {
    try {
      const baseUrl = CONFIG.bybit.testnet 
        ? CONFIG.bybit.baseUrl.testnet 
        : CONFIG.bybit.baseUrl.mainnet;
        
      await this.axios.get(`${baseUrl}/v5/market/time`);
      return { status: 'connected' };
    } catch (error) {
      return { 
        status: 'disconnected',
        error: error.message
      };
    }
  }
}

// Export the enhanced client
export const bybitClient = new EnhancedBybitClient();