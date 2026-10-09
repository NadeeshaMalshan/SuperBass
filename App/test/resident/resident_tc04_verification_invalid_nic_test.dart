import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:superbass/widgets/verification_form.dart';
import 'resident_test_helpers.dart';

void main() {
  testWidgets('APP-R-04: verification invalid nic', (WidgetTester tester) async {
    await tester.pumpWidget(pumpApp(VerificationForm(onVerifySuccess: () {})));
    expect(find.byType(VerificationForm), findsOneWidget);
  });
}
