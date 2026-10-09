import 'package:flutter_test/flutter_test.dart';
import 'package:superbass/models/booking_model.dart';

void main() {
  group('TC-06: Pricing Model & Cost Extraction (App)', () {
    test('parses estimatedPrice when provided as int or double', () {
      final jsonWithInt = {
        'id': 601,
        'residentEmail': 'res@test.com',
        'workerId': 2,
        'jobTitle': 'Door Hinge Repair',
        'pricingModel': 'Hourly',
        'estimatedPrice': 2500, // int
      };

      final b1 = BookingModel.fromJson(jsonWithInt);
      expect(b1.estimatedPrice, 2500.0);

      final jsonWithDouble = {
        'id': 602,
        'residentEmail': 'res@test.com',
        'workerId': 2,
        'jobTitle': 'Door Hinge Repair',
        'pricingModel': 'Fixed',
        'estimatedPrice': 3250.75, // double
      };

      final b2 = BookingModel.fromJson(jsonWithDouble);
      expect(b2.estimatedPrice, 3250.75);
      expect(b2.pricingModel, 'Fixed');
    });

    test('extracts agreed price when present', () {
      final json = {
        'id': 603,
        'residentEmail': 'res@test.com',
        'workerId': 2,
        'jobTitle': 'Door Hinge Repair',
        'agreedPrice': 4000,
      };

      final b = BookingModel.fromJson(json);
      expect(b.agreedPrice, 4000.0);
    });
  });
}
