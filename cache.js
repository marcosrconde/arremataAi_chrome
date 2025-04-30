// Cache Service
class CacheService {
  constructor() {
    this.CACHE_KEY = 'propertyAnalysisCache';
    this.CACHE_EXPIRATION = 48 * 60 * 60 * 1000; // 48 hours in milliseconds
  }

  // Check if cache is valid
  isValidCache(cacheEntry) {
    if (!cacheEntry || !cacheEntry.timestamp) {
      return false;
    }
    const now = Date.now();
    return (now - cacheEntry.timestamp) < this.CACHE_EXPIRATION;
  }

  // Get cache for URL
  async getCache(url) {
    try {
      const cache = await chrome.storage.local.get(this.CACHE_KEY);
      const propertyCache = cache[this.CACHE_KEY] || {};
      
      if (!propertyCache[url]) {
        return null;
      }
      
      if (!this.isValidCache(propertyCache[url])) {
        await this.clearCacheForUrl(url);
        return null;
      }
      
      return propertyCache[url].data;
    } catch (error) {
      console.error('Error getting cache:', error);
      return null;
    }
  }

  // Save to cache
  async saveToCache(url, data) {
    try {
      console.log('Saving to cache for URL:', url);
      const cache = await chrome.storage.local.get(this.CACHE_KEY);
      const propertyCache = cache[this.CACHE_KEY] || {};
      
      propertyCache[url] = {
        data: data,
        timestamp: Date.now(),
        firestoreId: data.firestoreId // Store the Firestore document ID
      };
      
      await chrome.storage.local.set({ [this.CACHE_KEY]: propertyCache });
      console.log('Data saved to cache successfully');
      return true;
    } catch (error) {
      console.error('Error saving to cache:', error);
      return false;
    }
  }

  // Clear cache for URL
  async clearCacheForUrl(url) {
    try {
      const cache = await chrome.storage.local.get(this.CACHE_KEY);
      const propertyCache = cache[this.CACHE_KEY] || {};
      
      if (propertyCache[url]) {
        delete propertyCache[url];
        await chrome.storage.local.set({ [this.CACHE_KEY]: propertyCache });
        console.log('Cache cleared for URL:', url);
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  // Clear all cache
  async clearAllCache() {
    try {
      await chrome.storage.local.remove(this.CACHE_KEY);
      console.log('All cache cleared');
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }
}

// Export the service
export default CacheService;