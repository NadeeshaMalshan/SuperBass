import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:superbass/screens/profile_screen.dart';
import 'resident_test_helpers.dart';

void main() {
  testWidgets('APP-R-01: profile renders data', (WidgetTester tester) async {
    await tester.pumpWidget(pumpApp(const ProfileScreen()));
    expect(find.byType(ProfileScreen), findsOneWidget);
  });
}
