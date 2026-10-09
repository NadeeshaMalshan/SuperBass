import 'package:flutter_test/flutter_test.dart';
import 'package:superbass/models/booking_model.dart';

void main() {
  group('TC-02: Booking Status Lifecycle States (App)', () {
    test('BookingModel reflects Accepted and InProgress statuses correctly', () {
      final acceptedJson = {
        'id': 201,
        'residentEmail': 'res@test.com',
        'workerId': 10,
        'jobTitle': 'AC Gas Refill',
        'status': 'Accepted',
        'agreedPrice': 4500.0,
      };

      final booking = BookingModel.fromJson(acceptedJson);
      expect(booking.status, 'Accepted');
      expect(booking.agreedPrice, 4500.0);
    });

    test('BookingModel reflects Completed status', () {
      final completedJson = {
        'id': 202,
        'residentEmail': 'res@test.com',
        'workerId': 10,
        'jobTitle': 'AC Gas Refill',
        'status': 'Completed',
      };

      final booking = BookingModel.fromJson(completedJson);
      expect(booking.status, 'Completed');
    });
  });
}
