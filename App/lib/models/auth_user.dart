class AuthUser {
  final String token;
  final String email;
  final String name;
  final String? picture;
  final bool isNewUser;
  final bool isWorker;
  final bool isNewWorker;
  final String activeRole;
  final int? workerId;
  final double? locationLat;
  final double? locationLng;
  final bool isVerified;

  AuthUser({
    required this.token,
    required this.email,
    required this.name,
    this.picture,
    this.isNewUser = false,
    this.isWorker = false,
    this.isNewWorker = false,
    this.activeRole = 'Resident',
    this.workerId,
    this.locationLat,
    this.locationLng,
    this.isVerified = false,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      token: json['token'] as String? ?? '',
      email: json['email'] as String? ?? '',
      name: json['name'] as String? ?? json['email'] as String? ?? 'User',
      picture: json['picture'] as String?,
      isNewUser: json['isNewUser'] as bool? ?? false,
      isWorker: json['isWorker'] as bool? ?? false,
      isNewWorker: json['isNewWorker'] as bool? ?? false,
      activeRole: json['activeRole'] as String? ??
          ((json['isWorker'] == true || json['activeRole'] == 'Worker') ? 'Worker' : 'Resident'),
      workerId: json['workerId'] as int?,
      locationLat: (json['locationLat'] as num?)?.toDouble(),
      locationLng: (json['locationLng'] as num?)?.toDouble(),
      isVerified: json['isVerified'] == true || json['IsVerified'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'token': token,
      'email': email,
      'name': name,
      'picture': picture,
      'isNewUser': isNewUser,
      'isWorker': isWorker,
      'isNewWorker': isNewWorker,
      'activeRole': activeRole,
      'workerId': workerId,
      'locationLat': locationLat,
      'locationLng': locationLng,
      'isVerified': isVerified,
    };
  }

  AuthUser copyWith({
    String? token,
    String? email,
    String? name,
    String? picture,
    bool? isNewUser,
    bool? isWorker,
    bool? isNewWorker,
    String? activeRole,
    int? workerId,
    double? locationLat,
    double? locationLng,
    bool? isVerified,
  }) {
    return AuthUser(
      token: token ?? this.token,
      email: email ?? this.email,
      name: name ?? this.name,
      picture: picture ?? this.picture,
      isNewUser: isNewUser ?? this.isNewUser,
      isWorker: isWorker ?? this.isWorker,
      isNewWorker: isNewWorker ?? this.isNewWorker,
      activeRole: activeRole ?? this.activeRole,
      workerId: workerId ?? this.workerId,
      locationLat: locationLat ?? this.locationLat,
      locationLng: locationLng ?? this.locationLng,
      isVerified: isVerified ?? this.isVerified,
    );
  }
}
