import 'package:flutter_test/flutter_test.dart';
import 'package:superbass/models/booking_model.dart';

void main() {
  group('TC-04: Booking List Sorting & Status Filtering (App)', () {
    test('sorts bookings with nearest scheduled date first', () {
      final b1 = BookingModel(
        id: 1,
        residentEmail: 'r1@test.com',
        residentName: 'Res 1',
        workerId: 10,
        workerName: 'Worker 1',
        jobTitle: 'Job 1',
        scheduledDate: DateTime(2026, 10, 20),
        createdAt: DateTime.now(),
      );

      final b2 = BookingModel(
        id: 2,
        residentEmail: 'r2@test.com',
        residentName: 'Res 2',
        workerId: 10,
        workerName: 'Worker 1',
        jobTitle: 'Job 2',
        scheduledDate: DateTime(2026, 10, 15),
        createdAt: DateTime.now(),
      );

      final list = [b1, b2];
      list.sort((a, b) {
        if (a.scheduledDate == null) return 1;
        if (b.scheduledDate == null) return -1;
        return a.scheduledDate!.compareTo(b.scheduledDate!);
      });

      expect(list.first.id, 2);
      expect(list.last.id, 1);
    });

    test('filters bookings by status correctly', () {
      final list = [
        BookingModel(id: 1, residentEmail: 'r@test.com', residentName: 'R', workerId: 1, workerName: 'W', jobTitle: 'J1', status: 'Pending', createdAt: DateTime.now()),
        BookingModel(id: 2, residentEmail: 'r@test.com', residentName: 'R', workerId: 1, workerName: 'W', jobTitle: 'J2', status: 'Accepted', createdAt: DateTime.now()),
        BookingModel(id: 3, residentEmail: 'r@test.com', residentName: 'R', workerId: 1, workerName: 'W', jobTitle: 'J3', status: 'Completed', createdAt: DateTime.now()),
      ];

      final active = list.where((b) => b.status == 'Pending' || b.status == 'Accepted').toList();
      final history = list.where((b) => b.status == 'Completed').toList();

      expect(active.length, 2);
      expect(history.length, 1);
    });
  });
}
