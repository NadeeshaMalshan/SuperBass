import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

class ApiConfig {
  /// Default backend base URL depending on platform.
  /// Android emulator maps 10.0.2.2 to host machine's localhost.
  /// Windows, Web, macOS, and iOS simulators use localhost:5237.
  static String get baseUrl {
    if (kIsWeb) {
      return 'http://localhost:5237';
    }
    try {
      if (Platform.isAndroid) {
        return 'http://10.0.2.2:5237';
      }
    } catch (_) {
      // Fallback if Platform is not supported
    }
    return 'http://localhost:5237';
  }

  // Endpoints
  static String get googleAuthUrl => '$baseUrl/api/auth/google';
  static String get onboardingUrl => '$baseUrl/api/auth/onboarding';

  // Google OAuth Web Client ID (from Frontend/src/Join.jsx)
  static const String googleClientId =
      '918768879306-9tv31jo0ot00ogc496h13e6tccfv63qe.apps.googleusercontent.com';
}
