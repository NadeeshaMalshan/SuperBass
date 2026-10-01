import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:superbass/screens/join_screen.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('JoinScreen renders separate Resident and Worker login buttons like web', (WidgetTester tester) async {
    // Use an adequate surface size to render both cards cleanly
    tester.view.physicalSize = const Size(1200, 1000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      const MaterialApp(
        home: JoinScreen(),
      ),
    );

    // Verify header title and description are present
    expect(find.text('Log in to access your account'), findsOneWidget);

    // Verify separate Resident and Worker login options exist
    expect(find.text('Resident'), findsOneWidget);
    expect(find.text('Worker'), findsOneWidget);
    expect(find.text('Sign In / Sign Up as Resident'), findsOneWidget);
    expect(find.text('Sign In / Sign Up as Worker'), findsOneWidget);

    // Verify Google logo icons are rendered
    expect(find.byType(GoogleLogoIcon), findsAtLeastNWidgets(2));

    // Verify Dev / Demo Sign In and backend indicator are NOT present
    expect(find.text('Dev / Demo Sign In'), findsNothing);
    expect(find.textContaining('Backend:'), findsNothing);
  });
}
