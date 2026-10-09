import 'package:flutter_test/flutter_test.dart';
import 'package:superbass/models/booking_model.dart';

void main() {
  group('TC-05: Booking Scheduling & DateTime Parsing (App)', () {
    test('parses ISO 8601 scheduled date accurately', () {
      final json = {
        'id': 501,
        'residentEmail': 'user@workio.lk',
        'workerId': 3,
        'jobTitle': 'CCTV Camera Wiring',
        'scheduledDate': '2026-11-05T09:30:00.000Z',
      };

      final booking = BookingModel.fromJson(json);
      expect(booking.scheduledDate, isNotNull);
      expect(booking.scheduledDate!.year, 2026);
      expect(booking.scheduledDate!.month, 11);
      expect(booking.scheduledDate!.day, 5);
    });

    test('handles null scheduled date without throwing exception', () {
      final json = {
        'id': 502,
        'residentEmail': 'user@workio.lk',
        'workerId': 3,
        'jobTitle': 'Immediate Plumbing Help',
        'scheduledDate': null,
      };

      final booking = BookingModel.fromJson(json);
      expect(booking.scheduledDate, isNull);
    });
  });
}
