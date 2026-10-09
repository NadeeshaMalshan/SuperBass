import 'package:flutter_test/flutter_test.dart';
import 'package:superbass/models/community_post_model.dart';

void main() {
  test('App Community TC-05: copyWith updates specific fields while preserving others', () {
    final original = CommunityPostModel(
      postId: 10,
      userId: 'user@workio.lk',
      userName: 'Amal',
      title: 'Original Title',
      content: 'Original Content',
      createdAt: DateTime.now(),
      likesCount: 5,
      isLikedByMe: false,
    );

    final updated = original.copyWith(
      title: 'Updated Title',
      likesCount: 6,
      isLikedByMe: true,
    );

    expect(updated.postId, 10);
    expect(updated.userId, 'user@workio.lk');
    expect(updated.title, 'Updated Title');
    expect(updated.content, 'Original Content');
    expect(updated.likesCount, 6);
    expect(updated.isLikedByMe, isTrue);
  });
}
