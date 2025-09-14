/**
 * OPTIMIZED Caching Layer
 *
 * Performance improvements:
 * - Redis for distributed caching
 * - Memory cache fallback
 * - Cache invalidation strategies
 * - Compression for large objects
 * - TTL management
 * - Cache warming strategies
 */

const Redis = require("ioredis");
const zlib = require("zlib");
const crypto = require("crypto");

class CacheManager {
  constructor(options = {}) {
    this.redis = null;
    this.memoryCache = new Map();
    this.maxMemorySize = options.maxMemorySize || 100 * 1024 * 1024; // 100MB
    this.currentMemorySize = 0;
    this.compressionThreshold = options.compressionThreshold || 1024; // 1KB
    this.defaultTTL = options.defaultTTL || 3600; // 1 hour
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    try {
      // Initialize Redis connection
      this.redis = new Redis({
        host: process.env.REDIS_HOST || "localhost",
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
        retryDelayOnClusterDown: 300,
        enableReadyCheck: false,
        maxLoadingTimeout: 5000,
      });

      // Test Redis connection
      await this.redis.ping();
      console.log("✅ Redis connected successfully");
    } catch (error) {
      console.warn(
        "⚠️  Redis not available, using memory cache only:",
        error.message,
      );
      this.redis = null;
    }

    this.initialized = true;
  }

  generateKey(prefix, ...parts) {
    const key = `${prefix}:${parts.join(":")}`;
    return crypto.createHash("md5").update(key).digest("hex");
  }

  async compress(data) {
    if (typeof data === "string" && data.length > this.compressionThreshold) {
      return zlib.gzipSync(data);
    }
    return data;
  }

  async decompress(data) {
    if (Buffer.isBuffer(data)) {
      try {
        return zlib.gunzipSync(data).toString();
      } catch (error) {
        return data.toString();
      }
    }
    return data;
  }

  async set(key, value, ttl = this.defaultTTL) {
    if (!this.initialized) await this.init();

    const serialized = JSON.stringify(value);
    const compressed = await this.compress(serialized);
    const ttlSeconds = Math.floor(ttl / 1000);

    // Try Redis first
    if (this.redis) {
      try {
        await this.redis.setex(key, ttlSeconds, compressed);
        return true;
      } catch (error) {
        console.warn(
          "Redis set failed, falling back to memory:",
          error.message,
        );
      }
    }

    // Fallback to memory cache
    this.memoryCache.set(key, {
      value: compressed,
      expires: Date.now() + ttl,
    });

    this.currentMemorySize += compressed.length;
    this.cleanupMemoryCache();
    return true;
  }

  async get(key) {
    if (!this.initialized) await this.init();

    // Try Redis first
    if (this.redis) {
      try {
        const compressed = await this.redis.get(key);
        if (compressed) {
          const decompressed = await this.decompress(compressed);
          return JSON.parse(decompressed);
        }
      } catch (error) {
        console.warn("Redis get failed, trying memory cache:", error.message);
      }
    }

    // Fallback to memory cache
    const cached = this.memoryCache.get(key);
    if (cached && cached.expires > Date.now()) {
      const decompressed = await this.decompress(cached.value);
      return JSON.parse(decompressed);
    }

    if (cached) {
      this.memoryCache.delete(key);
    }

    return null;
  }

  async del(key) {
    if (!this.initialized) await this.init();

    // Delete from Redis
    if (this.redis) {
      try {
        await this.redis.del(key);
      } catch (error) {
        console.warn("Redis del failed:", error.message);
      }
    }

    // Delete from memory cache
    const cached = this.memoryCache.get(key);
    if (cached) {
      this.currentMemorySize -= cached.value.length;
      this.memoryCache.delete(key);
    }
  }

  async mget(keys) {
    if (!this.initialized) await this.init();

    const results = {};

    // Try Redis first
    if (this.redis) {
      try {
        const values = await this.redis.mget(keys);
        for (let i = 0; i < keys.length; i++) {
          if (values[i]) {
            const decompressed = await this.decompress(values[i]);
            results[keys[i]] = JSON.parse(decompressed);
          }
        }
        return results;
      } catch (error) {
        console.warn("Redis mget failed, trying memory cache:", error.message);
      }
    }

    // Fallback to memory cache
    for (const key of keys) {
      const cached = this.memoryCache.get(key);
      if (cached && cached.expires > Date.now()) {
        const decompressed = await this.decompress(cached.value);
        results[key] = JSON.parse(decompressed);
      }
    }

    return results;
  }

  async mset(keyValuePairs, ttl = this.defaultTTL) {
    if (!this.initialized) await this.init();

    const ttlSeconds = Math.floor(ttl / 1000);

    // Try Redis first
    if (this.redis) {
      try {
        const pipeline = this.redis.pipeline();
        for (const [key, value] of Object.entries(keyValuePairs)) {
          const serialized = JSON.stringify(value);
          const compressed = await this.compress(serialized);
          pipeline.setex(key, ttlSeconds, compressed);
        }
        await pipeline.exec();
        return true;
      } catch (error) {
        console.warn("Redis mset failed, using memory cache:", error.message);
      }
    }

    // Fallback to memory cache
    for (const [key, value] of Object.entries(keyValuePairs)) {
      const serialized = JSON.stringify(value);
      const compressed = await this.compress(serialized);
      this.memoryCache.set(key, {
        value: compressed,
        expires: Date.now() + ttl,
      });
      this.currentMemorySize += compressed.length;
    }

    this.cleanupMemoryCache();
    return true;
  }

  cleanupMemoryCache() {
    if (this.currentMemorySize <= this.maxMemorySize) return;

    // Remove expired entries first
    for (const [key, cached] of this.memoryCache.entries()) {
      if (cached.expires <= Date.now()) {
        this.currentMemorySize -= cached.value.length;
        this.memoryCache.delete(key);
      }
    }

    // If still over limit, remove oldest entries
    if (this.currentMemorySize > this.maxMemorySize) {
      const entries = Array.from(this.memoryCache.entries());
      entries.sort((a, b) => a[1].expires - b[1].expires);

      for (const [key, cached] of entries) {
        this.currentMemorySize -= cached.value.length;
        this.memoryCache.delete(key);
        if (this.currentMemorySize <= this.maxMemorySize * 0.8) break;
      }
    }
  }

  async clear() {
    if (!this.initialized) await this.init();

    // Clear Redis
    if (this.redis) {
      try {
        await this.redis.flushdb();
      } catch (error) {
        console.warn("Redis clear failed:", error.message);
      }
    }

    // Clear memory cache
    this.memoryCache.clear();
    this.currentMemorySize = 0;
  }

  async close() {
    if (this.redis) {
      await this.redis.quit();
    }
    this.memoryCache.clear();
    this.initialized = false;
  }
}

// Specialized caches for different data types
class EmbeddingCache extends CacheManager {
  constructor() {
    super({
      maxMemorySize: 200 * 1024 * 1024, // 200MB for embeddings
      defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
      compressionThreshold: 512, // Compress smaller objects
    });
  }

  async cacheEmbedding(text, embedding, ttl = this.defaultTTL) {
    const key = this.generateKey(
      "embedding",
      crypto.createHash("sha256").update(text).digest("hex"),
    );
    return this.set(key, embedding, ttl);
  }

  async getEmbedding(text) {
    const key = this.generateKey(
      "embedding",
      crypto.createHash("sha256").update(text).digest("hex"),
    );
    return this.get(key);
  }

  async cacheSearchResults(query, entityType, results, ttl = 3600000) {
    // 1 hour
    const key = this.generateKey(
      "search",
      entityType,
      crypto.createHash("sha256").update(query).digest("hex"),
    );
    return this.set(key, results, ttl);
  }

  async getSearchResults(query, entityType) {
    const key = this.generateKey(
      "search",
      entityType,
      crypto.createHash("sha256").update(query).digest("hex"),
    );
    return this.get(key);
  }
}

class UserCache extends CacheManager {
  constructor() {
    super({
      maxMemorySize: 50 * 1024 * 1024, // 50MB for user data
      defaultTTL: 30 * 60 * 1000, // 30 minutes
      compressionThreshold: 2048,
    });
  }

  async cacheUser(userId, userData, ttl = this.defaultTTL) {
    const key = this.generateKey("user", userId);
    return this.set(key, userData, ttl);
  }

  async getUser(userId) {
    const key = this.generateKey("user", userId);
    return this.get(key);
  }

  async invalidateUser(userId) {
    const key = this.generateKey("user", userId);
    return this.del(key);
  }
}

// Export singleton instances
const embeddingCache = new EmbeddingCache();
const userCache = new UserCache();
const generalCache = new CacheManager();

module.exports = {
  CacheManager,
  EmbeddingCache,
  UserCache,
  embeddingCache,
  userCache,
  generalCache,
};
