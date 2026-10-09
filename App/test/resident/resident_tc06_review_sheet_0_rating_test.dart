import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:superbass/widgets/review_sheet.dart';
import 'resident_test_helpers.dart';

void main() {
  testWidgets('APP-R-06: review sheet 0 rating', (WidgetTester tester) async {
    await tester.pumpWidget(pumpApp(ReviewSheet(booking: getMockBooking(), onReviewSubmitted: () {})));
    expect(find.byType(ReviewSheet), findsOneWidget);
  });
}
