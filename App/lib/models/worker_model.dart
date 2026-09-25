class WorkerSkillItem {
  final int id;
  final String skillName;
  final int experienceYears;

  WorkerSkillItem({
    required this.id,
    required this.skillName,
    this.experienceYears = 1,
  });

  factory WorkerSkillItem.fromJson(Map<String, dynamic> json) {
    return WorkerSkillItem(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      skillName: json['skillName']?.toString() ?? '',
      experienceYears: json['experienceYears'] is int
          ? json['experienceYears']
          : int.tryParse(json['experienceYears']?.toString() ?? '1') ?? 1,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'skillName': skillName,
        'experienceYears': experienceYears,
      };
}

class WorkerModel {
  final int id;
  final String name;
  final String email;
  final String? phoneNo;
  final String? profileImage;
  final String? description;
  final String? primaryServiceArea;
  final double coverageRadiusKm;
  final double? locationLat;
  final double? locationLng;
  final String pricingModel;
  final double hourlyRate;
  final double dailyRate;
  final bool isAvailable;
  final double? overallRating;
  final double? qualityRating;
  final double? punctualityRating;
  final double? communicationRating;
  final int completedJobs;
  final int acceptedJobs;
  final int rejectedJobs;
  final int cancelledJobs;
  final String? availabilityScheduleJson;
  final List<String> skills;
  final List<WorkerSkillItem> skillItems;
  final double? distance;

  WorkerModel({
    required this.id,
    required this.name,
    required this.email,
    this.phoneNo,
    this.profileImage,
    this.description,
    this.primaryServiceArea,
    this.coverageRadiusKm = 10.0,
    this.locationLat,
    this.locationLng,
    this.pricingModel = 'Hourly',
    this.hourlyRate = 0.0,
    this.dailyRate = 0.0,
    this.isAvailable = true,
    this.overallRating,
    this.qualityRating,
    this.punctualityRating,
    this.communicationRating,
    this.completedJobs = 0,
    this.acceptedJobs = 0,
    this.rejectedJobs = 0,
    this.cancelledJobs = 0,
    this.availabilityScheduleJson,
    this.skills = const [],
    this.skillItems = const [],
    this.distance,
  });

  factory WorkerModel.fromJson(Map<String, dynamic> json) {
    List<String> parsedSkills = [];
    List<WorkerSkillItem> parsedSkillItems = [];

    if (json['skills'] is List) {
      for (final s in (json['skills'] as List)) {
        if (s is Map<String, dynamic>) {
          final item = WorkerSkillItem.fromJson(s);
          parsedSkillItems.add(item);
          if (item.skillName.isNotEmpty) {
            parsedSkills.add(item.skillName);
          }
        } else if (s is Map) {
          final item = WorkerSkillItem.fromJson(Map<String, dynamic>.from(s));
          parsedSkillItems.add(item);
          if (item.skillName.isNotEmpty) {
            parsedSkills.add(item.skillName);
          }
        } else {
          final str = s.toString();
          if (str.isNotEmpty) {
            parsedSkills.add(str);
            parsedSkillItems.add(WorkerSkillItem(id: 0, skillName: str));
          }
        }
      }
    }

    return WorkerModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      name: json['name'] as String? ?? 'Worker',
      email: json['email'] as String? ?? '',
      phoneNo: json['phoneNo'] as String?,
      profileImage: json['profileImage'] as String?,
      description: json['description'] as String?,
      primaryServiceArea: json['primaryServiceArea'] as String? ?? 'Colombo',
      coverageRadiusKm: (json['coverageRadiusKm'] as num?)?.toDouble() ?? 10.0,
      locationLat: (json['locationLat'] as num?)?.toDouble(),
      locationLng: (json['locationLng'] as num?)?.toDouble(),
      pricingModel: json['pricingModel'] as String? ?? 'Hourly',
      hourlyRate: (json['hourlyRate'] as num?)?.toDouble() ?? 0.0,
      dailyRate: (json['dailyRate'] as num?)?.toDouble() ?? 0.0,
      isAvailable: json['isAvailable'] as bool? ?? true,
      overallRating: (json['overallRating'] as num?)?.toDouble() ?? (json['OverallRating'] as num?)?.toDouble(),
      qualityRating: (json['qualityRating'] as num?)?.toDouble() ?? (json['QualityRating'] as num?)?.toDouble(),
      punctualityRating: (json['punctualityRating'] as num?)?.toDouble() ?? (json['PunctualityRating'] as num?)?.toDouble(),
      communicationRating: (json['communicationRating'] as num?)?.toDouble() ?? (json['CommunicationRating'] as num?)?.toDouble(),
      completedJobs: json['completedJobs'] as int? ?? 0,
      acceptedJobs: json['acceptedJobs'] as int? ?? 0,
      rejectedJobs: json['rejectedJobs'] as int? ?? 0,
      cancelledJobs: json['cancelledJobs'] as int? ?? 0,
      availabilityScheduleJson: json['availabilityScheduleJson'] as String?,
      skills: parsedSkills,
      skillItems: parsedSkillItems,
      distance: (json['distance'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'phoneNo': phoneNo,
      'profileImage': profileImage,
      'description': description,
      'primaryServiceArea': primaryServiceArea,
      'coverageRadiusKm': coverageRadiusKm,
      'locationLat': locationLat,
      'locationLng': locationLng,
      'pricingModel': pricingModel,
      'hourlyRate': hourlyRate,
      'dailyRate': dailyRate,
      'isAvailable': isAvailable,
      'overallRating': overallRating,
      'qualityRating': qualityRating,
      'punctualityRating': punctualityRating,
      'communicationRating': communicationRating,
      'completedJobs': completedJobs,
      'acceptedJobs': acceptedJobs,
      'rejectedJobs': rejectedJobs,
      'cancelledJobs': cancelledJobs,
      'availabilityScheduleJson': availabilityScheduleJson,
      'skills': skillItems.map((s) => s.toJson()).toList(),
    };
  }
}
