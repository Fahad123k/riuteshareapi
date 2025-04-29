// services/geocodingService.js
const axios = require('axios');

// In-memory cache with TTL (Time To Live)
const locationCache = new Map();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours cache

const HereApikey = process.env.HERE_API_KEY
console.log("here api", process.env.HERE_API_KEY)

class GeocodingService {
    constructor() {
        this.apiKey = HereApikey

    }

    async _fetchLocation(lat, lng) {
        try {
            const response = await axios.get(
                'https://revgeocode.search.hereapi.com/v1/revgeocode',
                {
                    params: {
                        at: `${lat},${lng}`,
                        apiKey: this.apiKey,
                        lang: 'en'
                    },
                    timeout: 5000 // 5 second timeout
                }
            );

            return response.data?.items?.[0]?.address || null;
        } catch (error) {
            console.error(`Geocoding failed for ${lat},${lng}:`, error.message);
            return null;
        }
    }

    async getAddressFromCoordinates(coordinates) {
        if (!coordinates || coordinates.length !== 2) {
            return { label: 'Invalid Coordinates' };
        }

        // GeoJSON uses [lng, lat] order
        const [lng, lat] = coordinates;
        const cacheKey = `${lat},${lng}`;

        // Check cache
        const cached = locationCache.get(cacheKey);
        if (cached) {
            if (Date.now() - cached.timestamp < CACHE_TTL) {
                return cached.address;
            }
            locationCache.delete(cacheKey); // Remove stale cache
        }

        // Fetch fresh data
        const address = await this._fetchLocation(lat, lng) || {
            label: 'Unknown Location',
            coordinates: [lng, lat] // Preserve original coordinates
        };

        // Update cache
        locationCache.set(cacheKey, {
            address,
            timestamp: Date.now()
        });

        return address;
    }

    async batchGeocode(coordinatesArray) {
        const results = [];
        for (const coords of coordinatesArray) {
            try {
                const address = await this.getAddressFromCoordinates(coords);
                results.push(address);
            } catch (error) {
                results.push({
                    label: 'Geocoding Failed',
                    coordinates: coords
                });
            }
        }
        return results;
    }
}

module.exports = new GeocodingService();