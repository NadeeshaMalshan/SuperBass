class WorkerSkillItem {
  final int id;
  final String serviceName; // The service / trade category (e.g. "Plumbing", "Electrical", "Carpentry")
  final List<String> skills; // Array of specific skills relevant to this service
  final int experienceYears;
  final String skillName; // Backward compatibility alias

  WorkerSkillItem({
    required this.id,
    required this.serviceName,
    this.skills = const [],
    this.experienceYears = 1,
    String? skillName,
  }) : skillName = (skillName != null && skillName.isNotEmpty) ? skillName : serviceName;

  factory WorkerSkillItem.fromJson(Map<String, dynamic> json) {
    final service = json['serviceName']?.toString() ??
        json['service']?.toString() ??
        json['skillName']?.toString() ??
        'General';

    List<String> parsedSkills = [];
    if (json['skills'] is List) {
      for (final item in (json['skills'] as List)) {
        if (item != null && item.toString().trim().isNotEmpty) {
          parsedSkills.add(item.toString().trim());
        }
      }
    } else if (json['skills'] is String && (json['skills'] as String).isNotEmpty) {
      parsedSkills = (json['skills'] as String)
          .split(',')
          .map((e) => e.trim())
          .where((e) => e.isNotEmpty)
          .toList();
    }

    return WorkerSkillItem(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      serviceName: service,
      skills: parsedSkills,
      experienceYears: json['experienceYears'] is int
          ? json['experienceYears']
          : int.tryParse(json['experienceYears']?.toString() ?? '1') ?? 1,
      skillName: json['skillName']?.toString() ?? service,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'serviceName': serviceName,
        'service': serviceName,
        'skills': skills,
        'experienceYears': experienceYears,
        'skillName': skillName,
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

  List<String> get serviceNames =>
      skillItems.map((s) => s.serviceName).where((s) => s.isNotEmpty).toSet().toList();

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
  });

  factory WorkerModel.fromJson(Map<String, dynamic> json) {
    List<String> parsedSkills = [];
    List<WorkerSkillItem> parsedSkillItems = [];

    if (json['skills'] is List) {
      for (final s in (json['skills'] as List)) {
        if (s is Map<String, dynamic>) {
          final item = WorkerSkillItem.fromJson(s);
          parsedSkillItems.add(item);
          if (item.serviceName.isNotEmpty && !parsedSkills.contains(item.serviceName)) {
            parsedSkills.add(item.serviceName);
          }
          for (final sub in item.skills) {
            if (!parsedSkills.contains(sub)) {
              parsedSkills.add(sub);
            }
          }
        } else if (s is Map) {
          final item = WorkerSkillItem.fromJson(Map<String, dynamic>.from(s));
          parsedSkillItems.add(item);
          if (item.serviceName.isNotEmpty && !parsedSkills.contains(item.serviceName)) {
            parsedSkills.add(item.serviceName);
          }
          for (final sub in item.skills) {
            if (!parsedSkills.contains(sub)) {
              parsedSkills.add(sub);
            }
          }
        } else {
          final str = s.toString().trim();
          if (str.isNotEmpty) {
            parsedSkills.add(str);
            parsedSkillItems.add(WorkerSkillItem(id: 0, serviceName: str, skills: [str]));
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
