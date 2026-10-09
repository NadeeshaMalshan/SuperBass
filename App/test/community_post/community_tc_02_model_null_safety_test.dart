import 'package:flutter_test/flutter_test.dart';
import 'package:superbass/models/community_post_model.dart';

void main() {
  test('App Community TC-02: Handles null, missing, and malformed fields gracefully', () {
    final Map<String, dynamic> emptyJson = {
      'postId': '99', // string postId
      'userId': null,
      'userName': null,
      'title': null,
      'content': null,
      'images': null,
      'likedByUsers': null,
      'createdAt': null,
    };

    final post = CommunityPostModel.fromJson(emptyJson);

    expect(post.postId, 99);
    expect(post.userId, '');
    expect(post.userName, 'Community Member');
    expect(post.title, '');
    expect(post.content, '');
    expect(post.serviceCategoryName, 'General');
    expect(post.location, 'Colombo');
    expect(post.images, isEmpty);
    expect(post.likedByUsers, isEmpty);
    expect(post.likesCount, 0);
    expect(post.isLikedByMe, isFalse);
  });
}
