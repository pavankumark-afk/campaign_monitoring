const { cache } = require('../utils/cache');

exports.useCache = (customTTL) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate a unique cache key incorporating user footprint to isolate privileges
    const userId = req.mla ? req.mla.id : 'public';
    const cacheKey = `__express__${req.originalUrl || req.url}_user_${userId}`;
    
    const cachedBody = cache.get(cacheKey);

    if (cachedBody) {
      console.log(`Cache Hit for key: ${cacheKey}`);
      return res.status(200).json(cachedBody);
    }

    console.log(`Cache Miss for key: ${cacheKey}. Fetching fresh database layout...`);

    // Intercept res.json to catch the database payload before it leaves the server
    const originalJson = res.json;
    res.json = function (body) {
      // Only cache successful 200 responses
      if (res.statusCode === 200) {
        cache.set(cacheKey, body, customTTL);
      }
      originalJson.call(this, body);
    };

    next();
  };
};