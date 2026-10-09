import 'package:flutter_test/flutter_test.dart';
import 'package:superbass/models/booking_model.dart';

void main() {
  group('TC-10: Booking-to-Chat Context Linking (App)', () {
    test('extracts conversationId from booking JSON correctly', () {
      final json = {
        'id': 777,
        'residentEmail': 'resident@workio.lk',
        'workerId': 15,
        'workerName': 'Anura Kumara',
        'jobTitle': 'Solar Inverter Inspection',
        'conversationId': 34,
        'status': 'Accepted',
      };

      final booking = BookingModel.fromJson(json);
      expect(booking.conversationId, 34);
      expect(booking.workerName, 'Anura Kumara');
    });

    test('handles string-based conversationId in JSON by parsing to int', () {
      final json = {
        'id': 778,
        'residentEmail': 'resident@workio.lk',
        'workerId': 15,
        'jobTitle': 'Solar Inverter Inspection',
        'conversationId': '48',
      };

      final booking = BookingModel.fromJson(json);
      expect(booking.conversationId, 48);
    });
  });
}
