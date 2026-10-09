import 'package:flutter_test/flutter_test.dart';
import 'package:superbass/models/booking_model.dart';

void main() {
  group('TC-03: Booking Cancellation and Reason Serialization (App)', () {
    test('BookingModel preserves cancellation reason across toJson and fromJson', () {
      final initialJson = {
        'id': 301,
        'residentEmail': 'resident@workio.lk',
        'workerId': 12,
        'jobTitle': 'Garden Clearing',
        'status': 'Cancelled',
        'cancellationReason': 'Heavy rain predicted for the weekend',
        'createdAt': '2026-10-10T10:00:00Z',
      };

      final booking = BookingModel.fromJson(initialJson);
      expect(booking.status, 'Cancelled');
      expect(booking.cancellationReason, 'Heavy rain predicted for the weekend');

      final serialized = booking.toJson();
      expect(serialized['status'], 'Cancelled');
      expect(serialized['cancellationReason'], 'Heavy rain predicted for the weekend');
    });

    test('BookingModel captures worker rejection reason', () {
      final rejectionJson = {
        'id': 302,
        'residentEmail': 'resident@workio.lk',
        'workerId': 12,
        'jobTitle': 'Door Lock Replacement',
        'status': 'Rejected',
        'rejectionReason': 'Worker is fully booked on this date',
      };

      final booking = BookingModel.fromJson(rejectionJson);
      expect(booking.status, 'Rejected');
      expect(booking.rejectionReason, 'Worker is fully booked on this date');
    });
  });
}
