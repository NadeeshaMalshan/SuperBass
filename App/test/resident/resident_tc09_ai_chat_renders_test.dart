import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:superbass/screens/workio_ai_screen.dart';
import 'resident_test_helpers.dart';

void main() {
  testWidgets('APP-R-09: ai chat renders', (WidgetTester tester) async {
    await tester.pumpWidget(pumpApp(const WorkioAiScreen()));
    expect(find.byType(WorkioAiScreen), findsOneWidget);
  });
}
