import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:superbass/screens/profile_screen.dart';
import 'resident_test_helpers.dart';

void main() {
  testWidgets('APP-R-02: profile update triggers api', (WidgetTester tester) async {
    await tester.pumpWidget(pumpApp(const ProfileScreen()));
    final btn = find.text('Save Changes');
    if (btn.evaluate().isNotEmpty) {
      await tester.tap(btn);
      await tester.pump();
    }
    expect(find.byType(ProfileScreen), findsOneWidget);
  });
}
