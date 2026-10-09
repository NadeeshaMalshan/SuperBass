import 'package:flutter_test/flutter_test.dart';
import 'package:superbass/models/community_post_model.dart';

void main() {
  test('App Community TC-03: Evaluates isLikedByMe based on currentUserEmail', () {
    final json = {
      'postId': 1,
      'title': 'Test Post',
      'content': 'Test Content',
      'likedByUsers': ['user1@workio.lk', 'user2@workio.lk'],
    };

    final postLiked = CommunityPostModel.fromJson(json, currentUserEmail: 'user1@workio.lk');
    final postNotLiked = CommunityPostModel.fromJson(json, currentUserEmail: 'stranger@workio.lk');

    expect(postLiked.isLikedByMe, isTrue);
    expect(postNotLiked.isLikedByMe, isFalse);
  });
}
