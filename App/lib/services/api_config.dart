import 'package:flutter_dotenv/flutter_dotenv.dart';

class ApiConfig {
  /// Optional runtime override if dynamic reconfiguration is needed
  static String? customBaseUrl;

  /// Retrieves backend base URL dynamically:
  /// 1. Programmatic override (customBaseUrl)
  /// 2. Value from .env file via flutter_dotenv
  /// 3. Fallback to compile-time environment variable (--dart-define)
  static String get baseUrl {
    if (customBaseUrl != null && customBaseUrl!.trim().isNotEmpty) {
      return customBaseUrl!.trim();
    }
    final envUrl = dotenv.env['BACKEND_URL'];
    if (envUrl != null && envUrl.trim().isNotEmpty) {
      return envUrl.trim();
    }
    const defineUrl = String.fromEnvironment('BACKEND_URL');
    if (defineUrl.isNotEmpty) {
      return defineUrl.trim();
    }
    return '';
  }

  // Endpoints
  static String get googleAuthUrl => '$baseUrl/api/auth/google';
  static String get onboardingUrl => '$baseUrl/api/auth/onboarding';

  /// Google OAuth Client ID loaded dynamically from .env or compile-time define
  static String get googleClientId {
    final envClientId = dotenv.env['GOOGLE_CLIENT_ID'];
    if (envClientId != null && envClientId.trim().isNotEmpty) {
      return envClientId.trim();
    }
    return const String.fromEnvironment('GOOGLE_CLIENT_ID');
  }

  /// OneSignal App ID loaded from .env or compile-time define
  static String get onesignalAppId {
    final envId = dotenv.env['ONESIGNAL_APP_ID'];
    if (envId != null && envId.trim().isNotEmpty) {
      return envId.trim();
    }
    const defineId = String.fromEnvironment('ONESIGNAL_APP_ID');
    if (defineId.isNotEmpty) {
      return defineId;
    }
    return 'b7e6df63-34ca-4bbd-8889-b8844c9b579b';
  }
}
