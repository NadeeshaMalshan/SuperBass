class CommunityPostModel {
  final int postId;
  final String userId;
  final String userName;
  final String userAvatar;
  final String title;
  final String content;
  final String serviceCategoryId;
  final String serviceCategoryName;
  final String location;
  final List<String> images;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final String status;
  final int likesCount;
  final int commentsCount;
  final List<String> likedByUsers;
  final int reportCount;
  final bool isLikedByMe;

  CommunityPostModel({
    required this.postId,
    required this.userId,
    required this.userName,
    this.userAvatar = '',
    required this.title,
    required this.content,
    this.serviceCategoryId = '',
    this.serviceCategoryName = 'General',
    this.location = 'Colombo',
    this.images = const [],
    required this.createdAt,
    this.updatedAt,
    this.status = 'Active',
    this.likesCount = 0,
    this.commentsCount = 0,
    this.likedByUsers = const [],
    this.reportCount = 0,
    this.isLikedByMe = false,
  });

  factory CommunityPostModel.fromJson(Map<String, dynamic> json, {String? currentUserEmail}) {
    List<String> parsedImages = [];
    if (json['images'] is List) {
      parsedImages = (json['images'] as List).map((e) => e.toString()).toList();
    }

    List<String> parsedLikedBy = [];
    if (json['likedByUsers'] is List) {
      parsedLikedBy = (json['likedByUsers'] as List).map((e) => e.toString()).toList();
    }

    bool liked = false;
    if (currentUserEmail != null && currentUserEmail.isNotEmpty) {
      liked = parsedLikedBy.contains(currentUserEmail);
    }

    return CommunityPostModel(
      postId: json['postId'] is int ? json['postId'] : int.tryParse(json['postId']?.toString() ?? '0') ?? 0,
      userId: json['userId'] as String? ?? '',
      userName: json['userName'] as String? ?? 'Community Member',
      userAvatar: json['userAvatar'] as String? ?? '',
      title: json['title'] as String? ?? '',
      content: json['content'] as String? ?? '',
      serviceCategoryId: json['serviceCategoryId'] as String? ?? '',
      serviceCategoryName: json['serviceCategoryName'] as String? ?? 'General',
      location: json['location'] as String? ?? 'Colombo',
      images: parsedImages,
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now() : DateTime.now(),
      updatedAt: json['updatedAt'] != null ? DateTime.tryParse(json['updatedAt'].toString()) : null,
      status: json['status'] as String? ?? 'Active',
      likesCount: json['likesCount'] as int? ?? 0,
      commentsCount: json['commentsCount'] as int? ?? 0,
      likedByUsers: parsedLikedBy,
      reportCount: json['reportCount'] as int? ?? 0,
      isLikedByMe: liked,
    );
  }

  bool isAuthor(String? currentUserEmail, String? currentUserName) {
    if (currentUserEmail != null && currentUserEmail.isNotEmpty) {
      final cleanEmail = currentUserEmail.trim().toLowerCase();
      final emailPrefix = cleanEmail.contains('@') ? cleanEmail.split('@')[0] : cleanEmail;
      final postUserId = userId.trim().toLowerCase();
      final postUserName = userName.trim().toLowerCase();

      if (postUserId == cleanEmail || postUserId == emailPrefix) return true;
      if (postUserName == cleanEmail || postUserName == emailPrefix) return true;
    }
    if (currentUserName != null && currentUserName.isNotEmpty) {
      final cleanName = currentUserName.trim().toLowerCase();
      if (userName.trim().toLowerCase() == cleanName) return true;
    }
    // Allow fallback edit if userId was default demo_user_1
    if (userId.isEmpty || userId == 'demo_user_1') return true;
    return false;
  }

  CommunityPostModel copyWith({
    int? postId,
    String? userId,
    String? userName,
    String? userAvatar,
    String? title,
    String? content,
    String? serviceCategoryId,
    String? serviceCategoryName,
    String? location,
    List<String>? images,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? status,
    int? likesCount,
    int? commentsCount,
    List<String>? likedByUsers,
    int? reportCount,
    bool? isLikedByMe,
  }) {
    return CommunityPostModel(
      postId: postId ?? this.postId,
      userId: userId ?? this.userId,
      userName: userName ?? this.userName,
      userAvatar: userAvatar ?? this.userAvatar,
      title: title ?? this.title,
      content: content ?? this.content,
      serviceCategoryId: serviceCategoryId ?? this.serviceCategoryId,
      serviceCategoryName: serviceCategoryName ?? this.serviceCategoryName,
      location: location ?? this.location,
      images: images ?? this.images,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      status: status ?? this.status,
      likesCount: likesCount ?? this.likesCount,
      commentsCount: commentsCount ?? this.commentsCount,
      likedByUsers: likedByUsers ?? this.likedByUsers,
      reportCount: reportCount ?? this.reportCount,
      isLikedByMe: isLikedByMe ?? this.isLikedByMe,
    );
  }
}

class CommunityCommentModel {
  final int commentId;
  final int postId;
  final String userId;
  final String userName;
  final String userAvatar;
  final String content;
  final DateTime createdAt;

  CommunityCommentModel({
    required this.commentId,
    required this.postId,
    required this.userId,
    required this.userName,
    this.userAvatar = '',
    required this.content,
    required this.createdAt,
  });

  factory CommunityCommentModel.fromJson(Map<String, dynamic> json) {
    return CommunityCommentModel(
      commentId: json['commentId'] is int ? json['commentId'] : int.tryParse(json['commentId']?.toString() ?? '0') ?? 0,
      postId: json['postId'] is int ? json['postId'] : int.tryParse(json['postId']?.toString() ?? '0') ?? 0,
      userId: json['userId'] as String? ?? '',
      userName: json['userName'] as String? ?? 'Resident',
      userAvatar: json['userAvatar'] as String? ?? '',
      content: json['content'] as String? ?? '',
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now() : DateTime.now(),
    );
  }
}

class ServiceCategoryModel {
  final String id;
  final String name;
  final String icon;

  ServiceCategoryModel({
    required this.id,
    required this.name,
    this.icon = '',
  });

  factory ServiceCategoryModel.fromJson(Map<String, dynamic> json) {
    return ServiceCategoryModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      icon: json['icon'] as String? ?? '',
    );
  }
}
