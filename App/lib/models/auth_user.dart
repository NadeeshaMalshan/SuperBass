class AuthUser {
  final String token;
  final String email;
  final String name;
  final String? picture;
  final bool isNewUser;
  final bool isWorker;
  final String activeRole;
  final int? workerId;
  final double? locationLat;
  final double? locationLng;

  AuthUser({
    required this.token,
    required this.email,
    required this.name,
    this.picture,
    this.isNewUser = false,
    this.isWorker = false,
    this.activeRole = 'Resident',
    this.workerId,
    this.locationLat,
    this.locationLng,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      token: json['token'] as String? ?? '',
      email: json['email'] as String? ?? '',
      name: json['name'] as String? ?? json['email'] as String? ?? 'User',
      picture: json['picture'] as String?,
      isNewUser: json['isNewUser'] as bool? ?? false,
      isWorker: json['isWorker'] as bool? ?? false,
      activeRole: json['activeRole'] as String? ??
          ((json['isWorker'] == true) ? 'Worker' : 'Resident'),
      workerId: json['workerId'] as int?,
      locationLat: (json['locationLat'] as num?)?.toDouble(),
      locationLng: (json['locationLng'] as num?)?.toDouble(),
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
      'activeRole': activeRole,
      'workerId': workerId,
      'locationLat': locationLat,
      'locationLng': locationLng,
    };
  }
}
