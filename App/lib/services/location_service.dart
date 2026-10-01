import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:superbass/data/sri_lanka_locations.dart';
import 'package:superbass/services/api_service.dart';

import 'location_service_stub.dart'
    if (dart.library.js_interop) 'location_service_web.dart'
    if (dart.library.html) 'location_service_web.dart'
    if (dart.library.io) 'location_service_io.dart';

class LocationService {
  static const String _prefKey = 'selected_find_location';

  static const Map<String, String> townDistrictMap = {
    'erathna': 'Ratnapura',
    'kuruwita': 'Ratnapura',
    'balangoda': 'Ratnapura',
    'pelmadulla': 'Ratnapura',
    'embilipitiya': 'Ratnapura',
    'eheliyagoda': 'Ratnapura',
    'homagama': 'Colombo',
    'dehiwala': 'Colombo',
    'moratuwa': 'Colombo',
    'maharagama': 'Colombo',
    'kotte': 'Colombo',
    'nugegoda': 'Colombo',
    'malabe': 'Colombo',
    'battaramulla': 'Colombo',
    'piliyandala': 'Colombo',
    'kesbewa': 'Colombo',
    'negombo': 'Gampaha',
    'kelaniya': 'Gampaha',
    'wattala': 'Gampaha',
    'ja-ela': 'Gampaha',
    'kadawatha': 'Gampaha',
    'minuwangoda': 'Gampaha',
    'panadura': 'Kalutara',
    'horana': 'Kalutara',
    'beruwala': 'Kalutara',
    'peradeniya': 'Kandy',
    'katugastota': 'Kandy',
    'gampola': 'Kandy',
    'hikkaduwa': 'Galle',
    'karapitiya': 'Galle',
    'weligama': 'Matara',
    'tangalle': 'Hambantota',
    'kuliyapitiya': 'Kurunegala',
    'chilaw': 'Puttalam',
    'hatton': 'Nuwara Eliya',
    'bandarawela': 'Badulla',
    'mawanella': 'Kegalle',
  };

  /// Save user's selected location/city
  static Future<void> setSelectedCity(String city) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefKey, city.trim());
  }

  /// Get user's selected location/city (defaults to GPS, fallback to 'Colombo')
  static Future<String> getSelectedCity() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_prefKey);
    if (saved != null && saved.isNotEmpty) {
      return saved;
    }
    try {
      final gpsCity = await detectGpsCity();
      if (gpsCity != null && gpsCity.isNotEmpty) {
        await prefs.setString(_prefKey, gpsCity);
        return gpsCity;
      }
    } catch (_) {}
    return 'Colombo';
  }

  /// Clean city name from special characters
  static String cleanLocationName(String raw) {
    return raw
        .replaceAll(RegExp(r'%2c', caseSensitive: false), '')
        .replaceAll(RegExp(r',?\s*\+?\s*lk\b', caseSensitive: false), '')
        .replaceAll(',', ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }

  /// Reverse geocode latitude and longitude to a city or locality name
  static Future<String?> reverseGeocode(double lat, double lng) async {
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
        if (address != null) {
          final candidate = address['suburb'] ??
              address['city'] ??
              address['town'] ??
              address['village'] ??
              address['neighbourhood'] ??
              address['county'] ??
              address['state_district'] ??
              address['city_district'];

          if (candidate != null && candidate.toString().trim().isNotEmpty) {
            return cleanLocationName(candidate.toString());
          }
        }
      }
    } catch (e) {
      debugPrint('Reverse geocode error: $e');
    }
    return null;
  }

  /// Detect device GPS location and return city/area name
  static Future<String?> detectGpsCity() async {
    try {
      final coords = await PlatformLocationService.getCurrentCoordinates();
      if (coords != null && coords['lat'] != null && coords['lng'] != null) {
        final city = await reverseGeocode(coords['lat']!, coords['lng']!);
        if (city != null && city.isNotEmpty) {
          return city;
        }
      }
    } catch (e) {
      debugPrint('Error detecting GPS coords: $e');
    }

    // Fallback: try IP-based location
    try {
      final ipUri = Uri.parse('https://ipapi.co/json/');
      final res = await http.get(ipUri).timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        final city = data['city'] as String?;
        if (city != null && city.trim().isNotEmpty) {
          return cleanLocationName(city);
        }
      }
    } catch (_) {}

    return 'Colombo';
  }

  /// Get user's primary address city (from resident profile or saved address)
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
            final geoCity = await reverseGeocode(lat, lng);
            if (geoCity != null && geoCity.isNotEmpty) {
              return geoCity;
            }
          }
        }
      } catch (e) {
        debugPrint('Error fetching resident profile for primary address: $e');
      }
    }

    if (rawAddress.isNotEmpty) {
      final extracted = extractCityFromAddress(rawAddress);
      if (extracted != null && extracted.isNotEmpty) {
        return extracted;
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
      final regex = RegExp('(?:^|[^a-z0-9])' + RegExp.escape(cityLower) + r'(?:$|[^a-z0-9])', caseSensitive: false);
      if (regex.hasMatch(lower)) {
        return city;
      }
    }

    // Check all divisional secretariats from dataset
    for (final entry in SriLankaLocations.districtDsMap.entries) {
      for (final ds in entry.value) {
        final dsClean = ds.split('/').first.split('-').first.trim().toLowerCase();
        if (dsClean.length >= 4) {
          final regex = RegExp('(?:^|[^a-z0-9])' + RegExp.escape(dsClean) + r'(?:$|[^a-z0-9])', caseSensitive: false);
          if (regex.hasMatch(lower)) {
            return ds.split('/').first.split('-').first.trim();
          }
        }
      }
    }

    // Check districts last
    for (final district in SriLankaLocations.districts) {
      final districtLower = district.toLowerCase();
      final regex = RegExp('(?:^|[^a-z0-9])' + RegExp.escape(districtLower) + r'(?:$|[^a-z0-9])', caseSensitive: false);
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

  /// Check if worker matches selected location/city
  static bool workerMatchesLocation(String? workerArea, String selectedCity) {
    if (selectedCity == 'All Locations' || selectedCity.trim().isEmpty) {
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
    String? workerDistrict = townDistrictMap[workerAreaLower];
    String? selectedDistrict = townDistrictMap[selectedCityLower];

    for (final entry in SriLankaLocations.districtDsMap.entries) {
      final districtLower = entry.key.toLowerCase();
      if (workerDistrict == null && workerAreaLower.contains(districtLower)) {
        workerDistrict = entry.key;
      }
      if (selectedDistrict == null && selectedCityLower.contains(districtLower)) {
        selectedDistrict = entry.key;
      }

      for (final ds in entry.value) {
        final dsLower = ds.toLowerCase();
        if (workerDistrict == null && workerAreaLower.contains(dsLower)) {
          workerDistrict = entry.key;
        }
        if (selectedDistrict == null && selectedCityLower.contains(dsLower)) {
          selectedDistrict = entry.key;
        }
      }
    }

    if (workerDistrict != null &&
        selectedDistrict != null &&
        workerDistrict.toLowerCase() == selectedDistrict.toLowerCase()) {
      return true;
    }

    return false;
  }
}
