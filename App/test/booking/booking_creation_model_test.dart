import 'package:flutter_test/flutter_test.dart';
import 'package:superbass/models/booking_model.dart';

void main() {
  group('TC-01: Booking Model Creation & Deserialization (App)', () {
    test('BookingModel.fromJson deserializes complete booking payload correctly', () {
      final json = {
        'id': 101,
        'residentEmail': 'resident@workio.lk',
        'residentName': 'Nadeesha Malshan',
        'workerId': 5,
        'workerName': 'Sunil Silva',
        'workerPhone': '0771234567',
        'jobTitle': 'Kitchen Sink Drainage Fix',
        'description': 'Water leaking under cabinet',
        'urgency': 'High',
        'locationAddress': 'Ratnapura Town',
        'pricingModel': 'Hourly',
        'estimatedPrice': 3500.0,
        'status': 'Pending',
        'createdAt': '2026-10-10T08:00:00Z',
      };

      final booking = BookingModel.fromJson(json);

      expect(booking.id, 101);
      expect(booking.residentEmail, 'resident@workio.lk');
      expect(booking.residentName, 'Nadeesha Malshan');
      expect(booking.workerId, 5);
      expect(booking.workerName, 'Sunil Silva');
      expect(booking.jobTitle, 'Kitchen Sink Drainage Fix');
      expect(booking.estimatedPrice, 3500.0);
      expect(booking.status, 'Pending');
    });

    test('BookingModel.fromJson handles missing optional fields gracefully', () {
      final json = {
        'id': '102',
        'residentEmail': 'user2@test.com',
        'workerId': '8',
        'jobTitle': 'Electrical Repair',
      };

      final booking = BookingModel.fromJson(json);

      expect(booking.id, 102);
      expect(booking.workerId, 8);
      expect(booking.status, 'Pending');
      expect(booking.locationAddress, 'Colombo');
      expect(booking.estimatedPrice, 0.0);
    });
  });
}
