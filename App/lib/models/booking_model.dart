class BookingModel {
  final int id;
  final String residentEmail;
  final String residentName;
  final int workerId;
  final String workerName;
  final String? workerPhone;
  final String? workerProfileImage;
  final String jobTitle;
  final String description;
  final String urgency;
  final DateTime? scheduledDate;
  final String locationAddress;
  final String pricingModel;
  final double estimatedPrice;
  final String status;
  final DateTime createdAt;

  BookingModel({
    required this.id,
    required this.residentEmail,
    required this.residentName,
    required this.workerId,
    required this.workerName,
    this.workerPhone,
    this.workerProfileImage,
    required this.jobTitle,
    this.description = '',
    this.urgency = 'Medium',
    this.scheduledDate,
    this.locationAddress = 'Colombo',
    this.pricingModel = 'Hourly',
    this.estimatedPrice = 0.0,
    this.status = 'Pending',
    required this.createdAt,
  });

  factory BookingModel.fromJson(Map<String, dynamic> json) {
    return BookingModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      residentEmail: json['residentEmail'] as String? ?? '',
      residentName: json['residentName'] as String? ?? 'Resident',
      workerId: json['workerId'] is int ? json['workerId'] : int.tryParse(json['workerId']?.toString() ?? '0') ?? 0,
      workerName: json['workerName'] as String? ?? 'Worker',
      workerPhone: json['workerPhone'] as String?,
      workerProfileImage: json['workerProfileImage'] as String?,
      jobTitle: json['jobTitle'] as String? ?? 'Home Service Request',
      description: json['description'] as String? ?? '',
      urgency: json['urgency'] as String? ?? 'Medium',
      scheduledDate: json['scheduledDate'] != null ? DateTime.tryParse(json['scheduledDate'].toString()) : null,
      locationAddress: json['locationAddress'] as String? ?? 'Colombo',
      pricingModel: json['pricingModel'] as String? ?? 'Hourly',
      estimatedPrice: (json['estimatedPrice'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] as String? ?? 'Pending',
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now() : DateTime.now(),
    );
  }
}
