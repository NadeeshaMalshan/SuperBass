/**
 * Centralized Sri Lanka City, District & Coordinates Data
 * Used for dynamic location-based worker search, map recentering, and coverage radius filtering.
 */

export const SRI_LANKA_CITIES = {
  // Western Province - Colombo District
  'Colombo': { lat: 6.9271, lng: 79.8612, district: 'Colombo', province: 'Western' },
  'Homagama': { lat: 6.8436, lng: 80.0032, district: 'Colombo', province: 'Western' },
  'Dehiwala': { lat: 6.8511, lng: 79.8659, district: 'Colombo', province: 'Western' },
  'Mount Lavinia': { lat: 6.8378, lng: 79.8667, district: 'Colombo', province: 'Western' },
  'Moratuwa': { lat: 6.7730, lng: 79.8816, district: 'Colombo', province: 'Western' },
  'Kotte': { lat: 6.8914, lng: 79.9048, district: 'Colombo', province: 'Western' },
  'Sri Jayawardenepura Kotte': { lat: 6.8914, lng: 79.9048, district: 'Colombo', province: 'Western' },
  'Kaduwela': { lat: 6.9333, lng: 79.9833, district: 'Colombo', province: 'Western' },
  'Maharagama': { lat: 6.8480, lng: 79.9265, district: 'Colombo', province: 'Western' },
  'Kesbewa': { lat: 6.7770, lng: 79.9542, district: 'Colombo', province: 'Western' },
  'Battaramulla': { lat: 6.8983, lng: 79.9192, district: 'Colombo', province: 'Western' },
  'Nugegoda': { lat: 6.8649, lng: 79.8997, district: 'Colombo', province: 'Western' },
  'Malabe': { lat: 6.9037, lng: 79.9555, district: 'Colombo', province: 'Western' },
  'Piliyandala': { lat: 6.8018, lng: 79.9227, district: 'Colombo', province: 'Western' },

  // Western Province - Gampaha District
  'Gampaha': { lat: 7.0840, lng: 79.9925, district: 'Gampaha', province: 'Western' },
  'Negombo': { lat: 7.2008, lng: 79.8736, district: 'Gampaha', province: 'Western' },
  'Kelaniya': { lat: 6.9538, lng: 79.9174, district: 'Gampaha', province: 'Western' },
  'Wattala': { lat: 6.9895, lng: 79.8920, district: 'Gampaha', province: 'Western' },
  'Ja-Ela': { lat: 7.0755, lng: 79.8923, district: 'Gampaha', province: 'Western' },
  'Kadawatha': { lat: 7.0016, lng: 79.9542, district: 'Gampaha', province: 'Western' },
  'Minuwangoda': { lat: 7.1652, lng: 79.9525, district: 'Gampaha', province: 'Western' },

  // Western Province - Kalutara District
  'Kalutara': { lat: 6.5854, lng: 79.9607, district: 'Kalutara', province: 'Western' },
  'Panadura': { lat: 6.7130, lng: 79.9074, district: 'Kalutara', province: 'Western' },
  'Horana': { lat: 6.7153, lng: 80.0625, district: 'Kalutara', province: 'Western' },
  'Beruwala': { lat: 6.4788, lng: 79.9828, district: 'Kalutara', province: 'Western' },
  'Matugama': { lat: 6.5222, lng: 80.1147, district: 'Kalutara', province: 'Western' },

  // Central Province
  'Kandy': { lat: 7.2906, lng: 80.6337, district: 'Kandy', province: 'Central' },
  'Peradeniya': { lat: 7.2605, lng: 80.5960, district: 'Kandy', province: 'Central' },
  'Katugastota': { lat: 7.3236, lng: 80.6224, district: 'Kandy', province: 'Central' },
  'Gampola': { lat: 7.1643, lng: 80.5694, district: 'Kandy', province: 'Central' },
  'Matale': { lat: 7.4675, lng: 80.6234, district: 'Matale', province: 'Central' },
  'Dambulla': { lat: 7.8742, lng: 80.6511, district: 'Matale', province: 'Central' },
  'Nuwara Eliya': { lat: 6.9497, lng: 80.7891, district: 'Nuwara Eliya', province: 'Central' },
  'Hatton': { lat: 6.8916, lng: 80.5964, district: 'Nuwara Eliya', province: 'Central' },

  // Southern Province
  'Galle': { lat: 6.0535, lng: 80.2210, district: 'Galle', province: 'Southern' },
  'Hikkaduwa': { lat: 6.1395, lng: 80.1063, district: 'Galle', province: 'Southern' },
  'Karapitiya': { lat: 6.0667, lng: 80.2267, district: 'Galle', province: 'Southern' },
  'Matara': { lat: 5.9549, lng: 80.5550, district: 'Matara', province: 'Southern' },
  'Weligama': { lat: 5.9729, lng: 80.4287, district: 'Matara', province: 'Southern' },
  'Hambantota': { lat: 6.1429, lng: 81.1212, district: 'Hambantota', province: 'Southern' },
  'Tangalle': { lat: 6.0242, lng: 80.7941, district: 'Hambantota', province: 'Southern' },

  // Northern Province
  'Jaffna': { lat: 9.6615, lng: 80.0255, district: 'Jaffna', province: 'Northern' },
  'Chavakachcheri': { lat: 9.6558, lng: 80.1558, district: 'Jaffna', province: 'Northern' },
  'Kilinochchi': { lat: 9.3803, lng: 80.3770, district: 'Kilinochchi', province: 'Northern' },
  'Mannar': { lat: 8.9810, lng: 79.9044, district: 'Mannar', province: 'Northern' },
  'Mullaitivu': { lat: 9.2671, lng: 80.8142, district: 'Mullaitivu', province: 'Northern' },
  'Vavuniya': { lat: 8.7542, lng: 80.4982, district: 'Vavuniya', province: 'Northern' },

  // Eastern Province
  'Trincomalee': { lat: 8.5874, lng: 81.2152, district: 'Trincomalee', province: 'Eastern' },
  'Batticaloa': { lat: 7.7310, lng: 81.6747, district: 'Batticaloa', province: 'Eastern' },
  'Ampara': { lat: 7.2975, lng: 81.6747, district: 'Ampara', province: 'Eastern' },
  'Kalmunai': { lat: 7.4167, lng: 81.8167, district: 'Ampara', province: 'Eastern' },

  // North Western Province
  'Kurunegala': { lat: 7.4863, lng: 80.3623, district: 'Kurunegala', province: 'North Western' },
  'Kuliyapitiya': { lat: 7.4689, lng: 80.0401, district: 'Kurunegala', province: 'North Western' },
  'Puttalam': { lat: 8.0362, lng: 79.8283, district: 'Puttalam', province: 'North Western' },
  'Chilaw': { lat: 7.5758, lng: 79.7953, district: 'Puttalam', province: 'North Western' },

  // North Central Province
  'Anuradhapura': { lat: 8.3114, lng: 80.4037, district: 'Anuradhapura', province: 'North Central' },
  'Polonnaruwa': { lat: 7.9403, lng: 81.0188, district: 'Polonnaruwa', province: 'North Central' },

  // Uva Province
  'Badulla': { lat: 6.9934, lng: 81.0550, district: 'Badulla', province: 'Uva' },
  'Bandarawela': { lat: 6.8259, lng: 80.9982, district: 'Badulla', province: 'Uva' },
  'Monaragala': { lat: 6.8728, lng: 81.3507, district: 'Monaragala', province: 'Uva' },

  // Sabaragamuwa Province
  'Ratnapura': { lat: 6.6828, lng: 80.4034, district: 'Ratnapura', province: 'Sabaragamuwa' },
  'Balangoda': { lat: 6.6494, lng: 80.7003, district: 'Ratnapura', province: 'Sabaragamuwa' },
  'Kegalle': { lat: 7.2513, lng: 80.3464, district: 'Kegalle', province: 'Sabaragamuwa' },
  'Mawanella': { lat: 7.2525, lng: 80.4461, district: 'Kegalle', province: 'Sabaragamuwa' }
};

/**
 * Returns [latitude, longitude] for a given city or district name.
 * Returns Colombo [6.9271, 79.8612] by default if not matched.
 */
export function getCoordinatesForCity(cityStr) {
  if (!cityStr) return [6.9271, 79.8612];
  const clean = cityStr.trim().toLowerCase();

  // Exact or contains match
  for (const [name, info] of Object.entries(SRI_LANKA_CITIES)) {
    if (name.toLowerCase() === clean) {
      return [info.lat, info.lng];
    }
  }

  for (const [name, info] of Object.entries(SRI_LANKA_CITIES)) {
    if (clean.includes(name.toLowerCase()) || name.toLowerCase().includes(clean)) {
      return [info.lat, info.lng];
    }
  }

  return [6.9271, 79.8612];
}

/**
 * Checks if a worker serves or is located near the selected city / district.
 */
export function matchesWorkerLocation(worker, selectedCity) {
  if (!selectedCity || !selectedCity.trim()) return true;
  const clean = selectedCity.trim().toLowerCase();

  if (
    clean === 'current location' ||
    clean === 'my location' ||
    clean === 'all' ||
    clean === 'all sri lanka' ||
    clean === 'all of sri lanka' ||
    clean === 'all locations' ||
    clean === 'islandwide'
  ) {
    return true;
  }

  const targetCityEntry = Object.entries(SRI_LANKA_CITIES).find(
    ([k]) => k.toLowerCase() === clean
  );
  const primaryArea = (worker.primaryServiceArea || '').trim().toLowerCase();
  const workerAreaEntry = primaryArea
    ? Object.entries(SRI_LANKA_CITIES).find(([k]) => k.toLowerCase() === primaryArea)
    : null;

  const targetDistrict = targetCityEntry ? targetCityEntry[1].district?.toLowerCase() : null;
  const workerDistrict = workerAreaEntry ? workerAreaEntry[1].district?.toLowerCase() : null;
  const sameDistrict = Boolean(targetDistrict && workerDistrict && targetDistrict === workerDistrict);

  const primaryAreaMatches = Boolean(
    primaryArea &&
    clean &&
    (primaryArea === clean ||
      (primaryArea.length >= 3 && clean.includes(primaryArea)) ||
      (clean.length >= 3 && primaryArea.includes(clean)))
  );

  // 1. Distance Match: When coordinates are present and distance from selected city is known
  if (worker.distance != null && !isNaN(worker.distance)) {
    const coverage = Math.max(worker.coverageRadiusKm || 15, 15);
    
    // Worker is physically within their coverage radius from the selected city center
    if (worker.distance <= coverage) {
      return true;
    }

    // Worker explicitly set this service area or is in the same district, within realistic commute distance (max 75km)
    if ((primaryAreaMatches || sameDistrict) && worker.distance <= 75) {
      return true;
    }

    // Any location further than coverage and not in the same declared region is rejected
    return false;
  }

  // 2. Fallback when worker has no coordinates: Match by declared service area or district
  if (primaryAreaMatches || sameDistrict) {
    return true;
  }

  return false;
}

/**
 * Extracts a matching Sri Lanka city/district from a freeform user address string.
 * e.g. "123 High Level Rd, Homagama, Colombo" -> "Homagama"
 * e.g. "No 45, Main Street, Ratnapura" -> "Ratnapura"
 * e.g. "Jaffna Town" -> "Jaffna"
 */
export function extractCityFromAddress(address) {
  if (!address || typeof address !== 'string') return null;
  const clean = address.trim().toLowerCase();

  // Sort city names by length descending so longer specific town names match first
  const sortedCities = Object.keys(SRI_LANKA_CITIES).sort((a, b) => b.length - a.length);
  for (const city of sortedCities) {
    const cityLower = city.toLowerCase();
    const regex = new RegExp('(?:^|[^a-z0-9])' + cityLower + '(?:$|[^a-z0-9])', 'i');
    if (regex.test(clean) || clean === cityLower) {
      return city;
    }
  }

  // Fallback substring check
  for (const city of sortedCities) {
    if (clean.includes(city.toLowerCase())) {
      return city;
    }
  }

  return null;
}
