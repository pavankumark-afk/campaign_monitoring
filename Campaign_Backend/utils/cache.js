const NodeCache = require('node-cache');

// Standard TTL: 10 minutes (600 seconds)
const appCache = new NodeCache({ stdTTL: 600, checkperiod: 60 });

module.exports = {
  cache: appCache,
  
  // Helper to clear specific keys or patterns (e.g., clear all voter-related caches)
  clearCachePattern: (pattern) => {
    const keys = appCache.keys();
    const targets = keys.filter(key => key.startsWith(pattern));
    targets.forEach(key => appCache.del(key));
    console.log(`Evicted ${targets.length} cache keys matching pattern: "${pattern}"`);
  }
};