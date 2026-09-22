import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

class ApiConfig {
  /// Compile-time environment variable passed via:
  /// flutter run --dart-define-from-file=.env
  static const String _envBaseUrl = String.fromEnvironment('BACKEND_URL');
  static const String _envGoogleClientId =
      String.fromEnvironment('GOOGLE_CLIENT_ID');

  /// Optional runtime override if dynamic reconfiguration is needed
  static String? customBaseUrl;

  /// Default backend base URL depending on environment or platform.
  /// 1. Uses customBaseUrl if set programmatically.
  /// 2. Uses BACKEND_URL from .env (--dart-define-from-file=.env) if provided.
  /// 3. Falls back to platform-specific localhost defaults:
  ///    - Web / iOS / Desktop: http://localhost:5237
  ///    - Android Emulator:    http://10.0.2.2:5237
  static String get baseUrl {
    if (customBaseUrl != null && customBaseUrl!.trim().isNotEmpty) {
      return customBaseUrl!.trim();
    }
    if (_envBaseUrl.isNotEmpty) {
      return _envBaseUrl.trim();
    }
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

  // Google OAuth Web Client ID (from .env or default fallback)
  static const String _defaultGoogleClientId =
      '918768879306-9tv31jo0ot00ogc496h13e6tccfv63qe.apps.googleusercontent.com';

  static String get googleClientId =>
      _envGoogleClientId.isNotEmpty ? _envGoogleClientId : _defaultGoogleClientId;
}
