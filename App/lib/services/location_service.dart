import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:superbass/data/sri_lanka_locations.dart';
import 'package:superbass/services/api_service.dart';

class LocationService {
  static const String _prefKey = 'selected_find_location';

  /// 25 Official District Centers (latitude, longitude) for Sri Lanka
  static const Map<String, Map<String, double>> districtCoordinates = {
    'Ampara': {'lat': 7.2975, 'lng': 81.6747},
    'Anuradhapura': {'lat': 8.3114, 'lng': 80.4037},
    'Badulla': {'lat': 6.9934, 'lng': 81.0550},
    'Batticaloa': {'lat': 7.7310, 'lng': 81.6747},
    'Colombo': {'lat': 6.9271, 'lng': 79.8612},
    'Galle': {'lat': 6.0535, 'lng': 80.2210},
    'Gampaha': {'lat': 7.0840, 'lng': 79.9925},
    'Hambantota': {'lat': 6.1429, 'lng': 81.1212},
    'Jaffna': {'lat': 9.6615, 'lng': 80.0255},
    'Kalutara': {'lat': 6.5854, 'lng': 79.9607},
    'Kandy': {'lat': 7.2906, 'lng': 80.6337},
    'Kegalle': {'lat': 7.2513, 'lng': 80.3464},
    'Kilinochchi': {'lat': 9.3803, 'lng': 80.3770},
    'Kurunegala': {'lat': 7.4863, 'lng': 80.3623},
    'Mannar': {'lat': 8.9810, 'lng': 79.9044},
    'Matale': {'lat': 7.4675, 'lng': 80.6234},
    'Matara': {'lat': 5.9549, 'lng': 80.5550},
    'Monaragala': {'lat': 6.8728, 'lng': 81.3507},
    'Mullaitivu': {'lat': 9.2671, 'lng': 80.8142},
    'Nuwara Eliya': {'lat': 6.9497, 'lng': 80.7891},
    'Polonnaruwa': {'lat': 7.9403, 'lng': 81.0188},
    'Puttalam': {'lat': 8.0362, 'lng': 79.8283},
    'Ratnapura': {'lat': 6.6828, 'lng': 80.4034},
    'Trincomalee': {'lat': 8.5874, 'lng': 81.2152},
    'Vavuniya': {'lat': 8.7542, 'lng': 80.4982},
  };

  /// Common town-to-district mappings for fast local lookups
  static const Map<String, String> townDistrictMap = {
    // Sabaragamuwa
    'erathna': 'Ratnapura',
    'kuruwita': 'Ratnapura',
    'balangoda': 'Ratnapura',
    'pelmadulla': 'Ratnapura',
    'embilipitiya': 'Ratnapura',
    'eheliyagoda': 'Ratnapura',
    'kalawana': 'Ratnapura',
    'kegalle': 'Kegalle',
    'mawanella': 'Kegalle',
    'warakapola': 'Kegalle',
    'rambukkana': 'Kegalle',

    // Western - Colombo
    'colombo': 'Colombo',
    'homagama': 'Colombo',
    'dehiwala': 'Colombo',
    'mount lavinia': 'Colombo',
    'moratuwa': 'Colombo',
    'kotte': 'Colombo',
    'sri jayawardenepura kotte': 'Colombo',
    'kaduwela': 'Colombo',
    'maharagama': 'Colombo',
    'kesbewa': 'Colombo',
    'battaramulla': 'Colombo',
    'nugegoda': 'Colombo',
    'malabe': 'Colombo',
    'piliyandala': 'Colombo',
    'avissawella': 'Colombo',
    'padukka': 'Colombo',
    'rajagiriya': 'Colombo',
    'ratmalana': 'Colombo',

    // Western - Gampaha
    'gampaha': 'Gampaha',
    'negombo': 'Gampaha',
    'kelaniya': 'Gampaha',
    'wattala': 'Gampaha',
    'ja-ela': 'Gampaha',
    'kadawatha': 'Gampaha',
    'minuwangoda': 'Gampaha',
    'kiribathgoda': 'Gampaha',
    'ragama': 'Gampaha',
    'biyagama': 'Gampaha',
    'mirigama': 'Gampaha',

    // Western - Kalutara
    'kalutara': 'Kalutara',
    'panadura': 'Kalutara',
    'horana': 'Kalutara',
    'beruwala': 'Kalutara',
    'matugama': 'Kalutara',
    'aluthgama': 'Kalutara',
    'bandaragama': 'Kalutara',

    // Central
    'kandy': 'Kandy',
    'peradeniya': 'Kandy',
    'katugastota': 'Kandy',
    'gampola': 'Kandy',
    'kundasale': 'Kandy',
    'matale': 'Matale',
    'dambulla': 'Matale',
    'nuwara eliya': 'Nuwara Eliya',
    'hatton': 'Nuwara Eliya',
    'talawakele': 'Nuwara Eliya',

    // Southern
    'galle': 'Galle',
    'hikkaduwa': 'Galle',
    'karapitiya': 'Galle',
    'ambalangoda': 'Galle',
    'matara': 'Matara',
    'weligama': 'Matara',
    'akuressa': 'Matara',
    'hambantota': 'Hambantota',
    'tangalle': 'Hambantota',
    'beliatta': 'Hambantota',

    // North Western
    'kurunegala': 'Kurunegala',
    'kuliyapitiya': 'Kurunegala',
    'narammala': 'Kurunegala',
    'puttalam': 'Puttalam',
    'chilaw': 'Puttalam',
    'wennappuwa': 'Puttalam',

    // North Central
    'anuradhapura': 'Anuradhapura',
    'kekirawa': 'Anuradhapura',
    'polonnaruwa': 'Polonnaruwa',
    'hingurakgoda': 'Polonnaruwa',

    // Uva
    'badulla': 'Badulla',
    'bandarawela': 'Badulla',
    'haputale': 'Badulla',
    'ella': 'Badulla',
    'monaragala': 'Monaragala',
    'wellawaya': 'Monaragala',

    // Northern
    'jaffna': 'Jaffna',
    'chavakachcheri': 'Jaffna',
    'point pedro': 'Jaffna',
    'kilinochchi': 'Kilinochchi',
    'mannar': 'Mannar',
    'vavuniya': 'Vavuniya',
    'mullaitivu': 'Mullaitivu',

    // Eastern
    'trincomalee': 'Trincomalee',
    'batticaloa': 'Batticaloa',
    'ampara': 'Ampara',
    'kalmunai': 'Ampara',
    'akkaraipattu': 'Ampara',
  };

  /// Save user's selected location/district
  static Future<void> setSelectedCity(String city) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefKey, city.trim());
  }

  /// Get user's selected location/district (defaults to GPS district, fallback to 'Colombo')
  static Future<String> getSelectedCity() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_prefKey);
    if (saved != null && saved.isNotEmpty) {
      return saved;
    }
    try {
      final gpsDistrict = await detectGpsDistrict();
      if (gpsDistrict != null && gpsDistrict.isNotEmpty) {
        await prefs.setString(_prefKey, gpsDistrict);
        return gpsDistrict;
      }
    } catch (_) {}
    return 'Colombo';
  }

  /// Clean location name from special characters and URL encoding
  static String cleanLocationName(String raw) {
    return raw
        .replaceAll(RegExp(r'%2c', caseSensitive: false), '')
        .replaceAll(RegExp(r',?\s*\+?\s*lk\b', caseSensitive: false), '')
        .replaceAll(',', ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }

  /// Resolve any place name, town, divisional secretariat, or address string to one of Sri Lanka's 25 districts
  static String? resolveToDistrict(String? placeOrAddress) {
    if (placeOrAddress == null || placeOrAddress.trim().isEmpty) return null;
    final text = cleanLocationName(placeOrAddress).toLowerCase();

    // 1. Exact match or with 'district' suffix (e.g. 'Colombo', 'Ratnapura District')
    for (final district in SriLankaLocations.districts) {
      final distLower = district.toLowerCase();
      if (text == distLower ||
          text == '$distLower district' ||
          text.startsWith('$distLower ') ||
          text.endsWith(' $distLower') ||
          text.contains('$distLower district')) {
        return district;
      }
    }

    // 2. Check townDistrictMap
    for (final entry in townDistrictMap.entries) {
      final townLower = entry.key.toLowerCase();
      final regex = RegExp(r'(?:^|[^a-z0-9])' + RegExp.escape(townLower) + r'(?:$|[^a-z0-9])');
      if (regex.hasMatch(text)) {
        return entry.value;
      }
    }

    // 3. Check Divisional Secretariats dataset
    for (final entry in SriLankaLocations.districtDsMap.entries) {
      final district = entry.key;
      for (final ds in entry.value) {
        final dsClean = ds.split('/').first.split('-').first.trim().toLowerCase();
        if (dsClean.length >= 3) {
          final regex = RegExp(r'(?:^|[^a-z0-9])' + RegExp.escape(dsClean) + r'(?:$|[^a-z0-9])');
          if (regex.hasMatch(text)) {
            return district;
          }
        }
      }
    }

    // 4. Substring check for official districts in the string
    for (final district in SriLankaLocations.districts) {
      final distLower = district.toLowerCase();
      final regex = RegExp(r'(?:^|[^a-z0-9])' + RegExp.escape(distLower) + r'(?:$|[^a-z0-9])');
      if (regex.hasMatch(text)) {
        return district;
      }
    }

    return null;
  }

  /// Given any (latitude, longitude) coordinate, calculate the closest official Sri Lanka District center
  static String findNearestDistrict(double lat, double lng) {
    String closestDistrict = 'Colombo';
    double minDistance = double.infinity;

    for (final entry in districtCoordinates.entries) {
      final dLat = entry.value['lat']! - lat;
      // Adjust longitude by cos(latitude ~ 7.5 deg) ≈ 0.99
      final dLng = (entry.value['lng']! - lng) * 0.99;
      final distance = (dLat * dLat) + (dLng * dLng);
      if (distance < minDistance) {
        minDistance = distance;
        closestDistrict = entry.key;
      }
    }

    return closestDistrict;
  }

  /// Reverse geocode latitude and longitude to one of Sri Lanka's 25 districts
  static Future<String?> reverseGeocodeToDistrict(double lat, double lng) async {
    try {
      final uri = Uri.parse(
        'https://nominatim.openstreetmap.org/reverse?format=json&lat=$lat&lon=$lng&zoom=14&addressdetails=1',
      );
      final response = await http.get(
        uri,
        headers: {'User-Agent': 'SuperBassApp/1.0'},
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final address = data['address'] as Map<String, dynamic>?;
        final displayName = data['display_name'] as String?;

        if (address != null) {
          // Check address fields in order of specificity
          final candidates = [
            address['district'],
            address['state_district'],
            address['county'],
            address['city'],
            address['town'],
            address['suburb'],
            address['village'],
            address['neighbourhood'],
          ];

          for (final c in candidates) {
            if (c != null && c.toString().trim().isNotEmpty) {
              final resolved = resolveToDistrict(c.toString());
              if (resolved != null) {
                return resolved;
              }
            }
          }
        }

        if (displayName != null && displayName.isNotEmpty) {
          final resolved = resolveToDistrict(displayName);
          if (resolved != null) {
            return resolved;
          }
        }
      }
    } catch (e) {
      debugPrint('[LocationService] Reverse geocode network error: $e');
    }

    // High-precision geographic fallback: Nearest district center
    return findNearestDistrict(lat, lng);
  }

  /// Reverse geocode latitude and longitude (returns resolved official District)
  static Future<String?> reverseGeocode(double lat, double lng) async {
    final district = await reverseGeocodeToDistrict(lat, lng);
    return district ?? 'Colombo';
  }

  /// Request device or browser GPS permission and return true if granted
  static Future<bool> requestLocationPermission() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        debugPrint('[LocationService] Location service disabled on device.');
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      return permission == LocationPermission.always || permission == LocationPermission.whileInUse;
    } catch (e) {
      debugPrint('[LocationService] Error requesting permission: $e');
      return false;
    }
  }

  /// Get current GPS coordinates (lat, lng) with runtime permission request
  static Future<Map<String, double>?> getCurrentCoordinates() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        debugPrint('[LocationService] Location services disabled.');
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          debugPrint('[LocationService] Location permissions denied.');
          return null;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        debugPrint('[LocationService] Location permissions permanently denied.');
        return null;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.medium,
          timeLimit: Duration(seconds: 10),
        ),
      );

      return {
        'lat': position.latitude,
        'lng': position.longitude,
      };
    } catch (e) {
      debugPrint('[LocationService] Error getting GPS coordinates: $e');
      return null;
    }
  }

  /// Detect device GPS location and return the resolved official Sri Lankan District
  static Future<String?> detectGpsDistrict() async {
    try {
      final coords = await getCurrentCoordinates();
      if (coords != null && coords['lat'] != null && coords['lng'] != null) {
        final district = await reverseGeocodeToDistrict(coords['lat']!, coords['lng']!);
        if (district != null && district.isNotEmpty) {
          return district;
        }
      }
    } catch (e) {
      debugPrint('[LocationService] Error detecting GPS coords: $e');
    }

    // Fallback: try IP-based location resolved to district
    try {
      final ipUri = Uri.parse('https://ipapi.co/json/');
      final res = await http.get(ipUri).timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        final city = data['city'] as String?;
        final region = data['region'] as String?;
        final dist = resolveToDistrict(city) ?? resolveToDistrict(region);
        if (dist != null) {
          return dist;
        }
      }
    } catch (_) {}

    return 'Colombo';
  }

  /// Detect device GPS location (district-wise, alias for detectGpsDistrict)
  static Future<String?> detectGpsCity() async {
    return detectGpsDistrict();
  }

  /// Get user's primary address (resolved to district where possible)
  static Future<String?> getPrimaryAddressCity(String? email) async {
    final prefs = await SharedPreferences.getInstance();

    String rawAddress = prefs.getString('userAddress') ??
        prefs.getString('address') ??
        '';

    if (email != null && email.isNotEmpty) {
      try {
        final profile = await ApiService().getResidentProfile(email);
        if (profile != null) {
          final addr = profile['address'] as String?;
          if (addr != null && addr.trim().isNotEmpty) {
            rawAddress = addr.trim();
            await prefs.setString('address', rawAddress);
          }
          final lat = (profile['locationLat'] as num?)?.toDouble();
          final lng = (profile['locationLng'] as num?)?.toDouble();
          if (lat != null && lng != null && rawAddress.isEmpty) {
            final geoDistrict = await reverseGeocodeToDistrict(lat, lng);
            if (geoDistrict != null && geoDistrict.isNotEmpty) {
              return geoDistrict;
            }
          }
        }
      } catch (e) {
        debugPrint('Error fetching resident profile for primary address: $e');
      }
    }

    if (rawAddress.isNotEmpty) {
      final district = resolveToDistrict(rawAddress);
      if (district != null) {
        return district;
      }
      final extracted = extractCityFromAddress(rawAddress);
      if (extracted != null && extracted.isNotEmpty) {
        final extDist = resolveToDistrict(extracted);
        return extDist ?? extracted;
      }
      return cleanLocationName(rawAddress);
    }

    return null;
  }

  /// Extract known city or town from an address string
  static String? extractCityFromAddress(String address) {
    if (address.trim().isEmpty) return null;
    final lower = address.toLowerCase();

    // Specific town names sorted by length descending so longer/specific names match first
    const specificTowns = [
      'Erathna',
      'Peradeniya',
      'Katugastota',
      'Battaramulla',
      'Maharagama',
      'Piliyandala',
      'Minuwangoda',
      'Kuliyapitiya',
      'Bandarawela',
      'Chavakachcheri',
      'Nuwara Eliya',
      'Anuradhapura',
      'Homagama',
      'Dehiwala',
      'Moratuwa',
      'Kelaniya',
      'Negombo',
      'Panadura',
      'Kadawatha',
      'Hikkaduwa',
      'Weligama',
      'Ratnapura',
      'Balangoda',
      'Kurunegala',
      'Trincomalee',
      'Batticaloa',
      'Colombo',
      'Kandy',
      'Galle',
      'Gampaha',
      'Matara',
      'Jaffna',
      'Badulla',
      'Horana',
      'Wattala',
      'Ja-Ela',
    ];

    for (final city in specificTowns) {
      final cityLower = city.toLowerCase();
      final regex = RegExp(r'(?:^|[^a-z0-9])' + RegExp.escape(cityLower) + r'(?:$|[^a-z0-9])', caseSensitive: false);
      if (regex.hasMatch(lower)) {
        return city;
      }
    }

    // Check all divisional secretariats from dataset
    for (final entry in SriLankaLocations.districtDsMap.entries) {
      for (final ds in entry.value) {
        final dsClean = ds.split('/').first.split('-').first.trim().toLowerCase();
        if (dsClean.length >= 4) {
          final regex = RegExp(r'(?:^|[^a-z0-9])' + RegExp.escape(dsClean) + r'(?:$|[^a-z0-9])', caseSensitive: false);
          if (regex.hasMatch(lower)) {
            return ds.split('/').first.split('-').first.trim();
          }
        }
      }
    }

    // Check districts last
    for (final district in SriLankaLocations.districts) {
      final districtLower = district.toLowerCase();
      final regex = RegExp(r'(?:^|[^a-z0-9])' + RegExp.escape(districtLower) + r'(?:$|[^a-z0-9])', caseSensitive: false);
      if (regex.hasMatch(lower)) {
        return district;
      }
    }

    // Fallback: take last segment if comma separated
    final segments = address.split(',');
    if (segments.length > 1) {
      final last = segments.last.trim();
      if (last.isNotEmpty && last.toLowerCase() != 'sri lanka' && last.toLowerCase() != 'lk') {
        return cleanLocationName(last);
      }
      final secondLast = segments[segments.length - 2].trim();
      if (secondLast.isNotEmpty) {
        return cleanLocationName(secondLast);
      }
    }

    return cleanLocationName(address);
  }

  /// Check if worker matches selected location/city (district-wise)
  static bool workerMatchesLocation(String? workerArea, String selectedCity) {
    if (selectedCity == 'All Locations' || selectedCity == 'All' || selectedCity.trim().isEmpty) {
      return true;
    }
    if (workerArea == null || workerArea.trim().isEmpty) {
      return true;
    }

    final workerAreaLower = workerArea.trim().toLowerCase();
    final selectedCityLower = selectedCity.trim().toLowerCase();

    if (workerAreaLower == selectedCityLower) {
      return true;
    }
    if (workerAreaLower.contains(selectedCityLower) ||
        selectedCityLower.contains(workerAreaLower)) {
      return true;
    }

    // Find districts for both worker area and selected city
    final workerDistrict = resolveToDistrict(workerArea);
    final selectedDistrict = resolveToDistrict(selectedCity);

    if (workerDistrict != null &&
        selectedDistrict != null &&
        workerDistrict.toLowerCase() == selectedDistrict.toLowerCase()) {
      return true;
    }

    return false;
  }
}
