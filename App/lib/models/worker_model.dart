class WorkerModel {
  final int id;
  final String name;
  final String email;
  final String? phoneNo;
  final String? profileImage;
  final String? description;
  final String? primaryServiceArea;
  final double? locationLat;
  final double? locationLng;
  final String pricingModel;
  final double hourlyRate;
  final double dailyRate;
  final bool isAvailable;
  final double overallRating;
  final int completedJobs;
  final List<String> skills;

  WorkerModel({
    required this.id,
    required this.name,
    required this.email,
    this.phoneNo,
    this.profileImage,
    this.description,
    this.primaryServiceArea,
    this.locationLat,
    this.locationLng,
    this.pricingModel = 'Hourly',
    this.hourlyRate = 0.0,
    this.dailyRate = 0.0,
    this.isAvailable = true,
    this.overallRating = 5.0,
    this.completedJobs = 0,
    this.skills = const [],
  });

  factory WorkerModel.fromJson(Map<String, dynamic> json) {
    List<String> parsedSkills = [];
    if (json['skills'] is List) {
      parsedSkills = (json['skills'] as List)
          .map((s) => s is Map ? (s['skillName']?.toString() ?? '') : s.toString())
          .where((s) => s.isNotEmpty)
          .toList();
    }

    return WorkerModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      name: json['name'] as String? ?? 'Worker',
      email: json['email'] as String? ?? '',
      phoneNo: json['phoneNo'] as String?,
      profileImage: json['profileImage'] as String?,
      description: json['description'] as String?,
      primaryServiceArea: json['primaryServiceArea'] as String? ?? 'Colombo',
      locationLat: (json['locationLat'] as num?)?.toDouble(),
      locationLng: (json['locationLng'] as num?)?.toDouble(),
      pricingModel: json['pricingModel'] as String? ?? 'Hourly',
      hourlyRate: (json['hourlyRate'] as num?)?.toDouble() ?? 0.0,
      dailyRate: (json['dailyRate'] as num?)?.toDouble() ?? 0.0,
      isAvailable: json['isAvailable'] as bool? ?? true,
      overallRating: (json['overallRating'] as num?)?.toDouble() ?? 5.0,
      completedJobs: json['completedJobs'] as int? ?? 0,
      skills: parsedSkills,
    );
  }
}
