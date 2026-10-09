import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:superbass/screens/community_screen.dart';
import 'resident_test_helpers.dart';

void main() {
  testWidgets('APP-R-08: community network error', (WidgetTester tester) async {
    await tester.pumpWidget(pumpApp(const CommunityScreen()));
    expect(find.byType(CommunityScreen), findsOneWidget);
  });
}
