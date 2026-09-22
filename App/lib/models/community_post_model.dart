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
  final int likesCount;
  final int commentsCount;
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
    this.likesCount = 0,
    this.commentsCount = 0,
    this.isLikedByMe = false,
  });

  factory CommunityPostModel.fromJson(Map<String, dynamic> json, {String? currentUserEmail}) {
    List<String> parsedImages = [];
    if (json['images'] is List) {
      parsedImages = (json['images'] as List).map((e) => e.toString()).toList();
    }

    bool liked = false;
    if (currentUserEmail != null && json['likedByUsers'] is List) {
      liked = (json['likedByUsers'] as List).contains(currentUserEmail);
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
      likesCount: json['likesCount'] as int? ?? 0,
      commentsCount: json['commentsCount'] as int? ?? 0,
      isLikedByMe: liked,
    );
  }
}
