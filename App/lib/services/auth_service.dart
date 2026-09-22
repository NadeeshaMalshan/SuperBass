import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:google_sign_in/google_sign_in.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/auth_user.dart';
import 'api_config.dart';

class AuthService {
  // Singleton pattern
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();

  final GoogleSignIn _googleSignIn = GoogleSignIn(
    serverClientId: kIsWeb ? null : ApiConfig.googleClientId,
    clientId: kIsWeb ? ApiConfig.googleClientId : null,
    scopes: ['email', 'profile'],
  );

  final ValueNotifier<AuthUser?> currentUserNotifier = ValueNotifier<AuthUser?>(null);

  AuthUser? get currentUser => currentUserNotifier.value;
  bool get isAuthenticated => currentUserNotifier.value != null;

  /// Initialize auth state from local storage (equivalent to localStorage in Join.jsx)
  Future<AuthUser?> init() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    if (token != null && token.isNotEmpty) {
      final user = AuthUser(
        token: token,
        email: prefs.getString('email') ?? '',
        name: prefs.getString('userName') ?? 'User',
        picture: prefs.getString('userPicture'),
        activeRole: prefs.getString('activeRole') ?? 'Resident',
        isWorker: prefs.getBool('isWorker') ?? false,
      );
      currentUserNotifier.value = user;
      return user;
    }
    return null;
  }

  /// Perform Google Sign-In and authenticate with the SuperBass backend
  Future<AuthUser> signInWithGoogle() async {
    try {
      final GoogleSignInAccount? googleAccount = await _googleSignIn.signIn();
      if (googleAccount == null) {
        throw Exception('Google sign-in was cancelled by user');
      }

      final GoogleSignInAuthentication googleAuth = await googleAccount.authentication;
      final String? accessToken = googleAuth.accessToken;
      final String? idToken = googleAuth.idToken;

      debugPrint('Google Access Token: $accessToken');
      debugPrint('Google ID Token: $idToken');

      if (accessToken == null && idToken == null) {
        throw Exception('Failed to obtain authentication tokens from Google');
      }

      return await sendTokensToBackend(
        accessToken: accessToken,
        idToken: idToken,
        fallbackPhotoUrl: googleAccount.photoUrl,
      );
    } catch (e) {
      debugPrint('Error during Google Sign-In: $e');
      final errStr = e.toString().toLowerCase();
      if (errStr.contains('sign_in_failed') || errStr.contains('10') || errStr.contains('developer_error')) {
        throw Exception(
          'Google Sign-In failed (ApiException 10). The APK SHA-1 fingerprint needs to be registered in Google Cloud Console under an Android OAuth Client ID.',
        );
      }
      rethrow;
    }
  }

  /// Sends Google tokens to Backend API: POST /api/auth/google
  Future<AuthUser> sendTokensToBackend({
    String? accessToken,
    String? idToken,
    String? fallbackPhotoUrl,
  }) async {
    final http.Response response;
    try {
      response = await http.post(
        Uri.parse(ApiConfig.googleAuthUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'accessToken': accessToken,
          'idToken': idToken,
        }),
      ).timeout(const Duration(seconds: 15));
    } catch (e) {
      debugPrint('Network error connecting to backend: $e');
      throw Exception(
        'Cannot connect to backend server at ${ApiConfig.baseUrl}. Please verify BACKEND_URL in .env (ensure it uses your live Render URL or PC Wi-Fi IP, not localhost on physical phones).',
      );
    }

    debugPrint('Backend response status: ${response.statusCode}');
    debugPrint('Backend response body: ${response.body}');

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final Map<String, dynamic> data = jsonDecode(response.body);
      var user = AuthUser.fromJson(data);

      if ((user.picture == null || user.picture!.isEmpty) &&
          fallbackPhotoUrl != null &&
          fallbackPhotoUrl.isNotEmpty) {
        user = AuthUser(
          token: user.token,
          email: user.email,
          name: user.name,
          picture: fallbackPhotoUrl,
          isNewUser: user.isNewUser,
          isWorker: user.isWorker,
          activeRole: user.activeRole,
          workerId: user.workerId,
        );
      }

      // Save credentials in SharedPreferences (matches Join.jsx localStorage)
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', user.token);
      await prefs.setString('userName', user.name);
      if (user.picture != null) {
        await prefs.setString('userPicture', user.picture!);
      }
      await prefs.setString('email', user.email);
      await prefs.setString('activeRole', user.activeRole);
      await prefs.setBool('isWorker', user.isWorker);

      currentUserNotifier.value = user;
      return user;
    } else {
      String errorMessage = 'Backend authentication failed (${response.statusCode})';
      try {
        final errJson = jsonDecode(response.body);
        if (errJson['message'] != null) {
          errorMessage = errJson['message'];
        }
      } catch (_) {}
      throw Exception(errorMessage);
    }
  }

  /// Dev / Testing login for local development without Google Cloud Console setup
  Future<AuthUser> devTestLogin({
    String email = 'nadeesha.test@example.com',
    String name = 'Nadeesha (Dev)',
    String role = 'Resident',
    bool isWorker = false,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final mockToken = 'dev_jwt_token_${DateTime.now().millisecondsSinceEpoch}';
    
    await prefs.setString('token', mockToken);
    await prefs.setString('userName', name);
    await prefs.setString('email', email);
    await prefs.setString('activeRole', role);
    await prefs.setBool('isWorker', isWorker);

    final user = AuthUser(
      token: mockToken,
      email: email,
      name: name,
      activeRole: role,
      isWorker: isWorker,
    );
    currentUserNotifier.value = user;
    return user;
  }

  /// Sign out and clear stored session
  Future<void> logout() async {
    try {
      await _googleSignIn.signOut();
    } catch (_) {}

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('userName');
    await prefs.remove('userPicture');
    await prefs.remove('email');
    await prefs.remove('activeRole');
    await prefs.remove('isWorker');

    currentUserNotifier.value = null;
  }
}
