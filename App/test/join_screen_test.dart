import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:superbass/main.dart';
import 'package:superbass/screens/join_screen.dart';
import 'package:superbass/services/auth_service.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('JoinScreen renders Google Login button and UI elements', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: JoinScreen(),
      ),
    );

    // Verify Google login button text is present
    expect(find.text('Login with Google'), findsOneWidget);

    // Verify Dev / Demo Sign In option is present
    expect(find.text('Dev / Demo Sign In'), findsOneWidget);

    // Verify GoogleLogoIcon custom paint is present
    expect(find.byType(GoogleLogoIcon), findsOneWidget);
  });

  testWidgets('JoinScreen opens Dev Sign In bottom sheet on tap', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        routes: {
          '/': (context) => const MainNavigationShell(),
          '/join': (context) => const JoinScreen(),
        },
        initialRoute: '/join',
      ),
    );

    // Tap on Dev / Demo Sign In
    final devButton = find.text('Dev / Demo Sign In');
    expect(devButton, findsOneWidget);
    await tester.tap(devButton);
    await tester.pumpAndSettle();

    // Verify modal bottom sheet options are displayed
    expect(find.text('Development & Offline Mode'), findsOneWidget);
    expect(find.text('Sign in as Resident'), findsOneWidget);
    expect(find.text('Sign in as Worker (Pro)'), findsOneWidget);

    // Tap 'Sign in as Resident'
    await tester.tap(find.text('Sign in as Resident'));
    await tester.pumpAndSettle();

    // Verify user is authenticated in AuthService
    expect(AuthService().isAuthenticated, isTrue);
    expect(AuthService().currentUser?.name, contains('Nadeesha'));
  });
}
