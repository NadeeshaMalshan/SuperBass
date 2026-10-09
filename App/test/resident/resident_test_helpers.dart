import 'package:flutter/material.dart';
import 'package:mocktail/mocktail.dart';
import 'package:superbass/services/api_service.dart';
import 'package:superbass/models/booking_model.dart';

class MockApiService extends Mock implements ApiService {}

Widget pumpApp(Widget child) {
  return MaterialApp(home: Scaffold(body: child));
}

BookingModel getMockBooking() {
  return BookingModel(
    id: 1,
    residentEmail: 'test@test.com',
    residentName: 'Test Resident',
    workerId: 10,
    workerName: 'Test Worker',
    jobTitle: 'Title',
    description: 'Desc',
    locationAddress: 'Addr',
    contactPhone: '123',
    scheduledDate: DateTime.parse('2026-10-10T10:00:00Z'),
    status: 'Completed',
    createdAt: DateTime.now(),
  );
}
