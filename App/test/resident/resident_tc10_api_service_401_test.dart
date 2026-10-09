import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'resident_test_helpers.dart';

void main() {
  testWidgets('APP-R-10: api service 401', (WidgetTester tester) async {
    final mockApi = MockApiService();
    when(() => mockApi.fetchCommunityPosts()).thenThrow(Exception('401'));
    expect(() => mockApi.fetchCommunityPosts(), throwsException);
  });
}
