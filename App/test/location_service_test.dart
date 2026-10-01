import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:superbass/services/location_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  group('LocationService tests', () {
    test('cleanLocationName removes unwanted characters and clean strings', () {
      expect(LocationService.cleanLocationName('Colombo%2c +lk'), 'Colombo');
      expect(LocationService.cleanLocationName('Ratnapura, Sri Lanka'), 'Ratnapura Sri Lanka');
    });

    test('extractCityFromAddress extracts city accurately from freeform address', () {
      expect(LocationService.extractCityFromAddress('Erathna Sri Pada Road, Ratnapura'), 'Erathna');
      expect(LocationService.extractCityFromAddress('No 24, Temple Road, Homagama'), 'Homagama');
      expect(LocationService.extractCityFromAddress('Galle Fort, Galle'), 'Galle');
      expect(LocationService.extractCityFromAddress('Kandy Central, Peradeniya Road'), 'Peradeniya');
    });

    test('workerMatchesLocation correctly checks area or district matching', () {
      // All locations match
      expect(LocationService.workerMatchesLocation('Colombo', 'All Locations'), isTrue);
      expect(LocationService.workerMatchesLocation(null, 'Colombo'), isTrue);

      // Same city match
      expect(LocationService.workerMatchesLocation('Colombo', 'Colombo'), isTrue);
      expect(LocationService.workerMatchesLocation('Erathna', 'Erathna'), isTrue);

      // District matching (Homagama is in Colombo district)
      expect(LocationService.workerMatchesLocation('Homagama', 'Colombo'), isTrue);
      expect(LocationService.workerMatchesLocation('Colombo', 'Homagama'), isTrue);

      // Erathna and Balangoda are in Ratnapura district
      expect(LocationService.workerMatchesLocation('Ratnapura', 'Erathna'), isTrue);

      // Unrelated cities do not match
      expect(LocationService.workerMatchesLocation('Kandy', 'Galle'), isFalse);
    });

    test('persists selected city in SharedPreferences', () async {
      await LocationService.setSelectedCity('Ratnapura');
      final city = await LocationService.getSelectedCity();
      expect(city, 'Ratnapura');
    });
  });
}
