import 'package:flutter_test/flutter_test.dart';
import 'package:superbass/models/community_post_model.dart';

void main() {
  test('App Community TC-01: Correctly parses valid JSON into CommunityPostModel', () {
    final json = {
      'postId': 101,
      'userId': 'kasun@workio.lk',
      'userName': 'Kasun Silva',
      'userAvatar': 'https://res.cloudinary.com/avatar.jpg',
      'title': 'Emergency Water Pipe Burst',
      'content': 'Main pipe leaking heavily in kitchen',
      'serviceCategoryId': 'Plumbing',
      'serviceCategoryName': 'Plumbing',
      'location': 'Colombo',
      'images': ['https://res.cloudinary.com/pipe1.jpg', 'https://res.cloudinary.com/pipe2.jpg'],
      'createdAt': '2026-10-05T09:30:00Z',
      'status': 'Active',
      'likesCount': 12,
      'commentsCount': 3,
      'likedByUsers': ['kasun@workio.lk', 'amal@workio.lk'],
      'isAuthorVerified': true,
    };

    final post = CommunityPostModel.fromJson(json, currentUserEmail: 'kasun@workio.lk');

    expect(post.postId, 101);
    expect(post.title, 'Emergency Water Pipe Burst');
    expect(post.userName, 'Kasun Silva');
    expect(post.serviceCategoryName, 'Plumbing');
    expect(post.location, 'Colombo');
    expect(post.images.length, 2);
    expect(post.likesCount, 12);
    expect(post.commentsCount, 3);
    expect(post.isLikedByMe, isTrue);
    expect(post.isAuthorVerified, isTrue);
  });
}
