import 'package:flutter_test/flutter_test.dart';
import 'package:superbass/models/community_post_model.dart';

void main() {
  test('App Community TC-06: isAuthor accurately validates author identity and names', () {
    final post = CommunityPostModel(
      postId: 20,
      userId: 'kasun@workio.lk',
      userName: 'Kasun Silva',
      title: 'Painting Required',
      content: 'Living room walls',
      createdAt: DateTime.now(),
    );

    // Exact email match
    expect(post.isAuthor('kasun@workio.lk', null), isTrue);

    // Author display name match
    expect(post.isAuthor(null, 'Kasun Silva'), isTrue);

    // Legacy unassigned user matches demo_user_1
    final demoPost = CommunityPostModel(
      postId: 21,
      userId: 'demo_user_1',
      userName: 'Demo',
      title: 'Demo Post',
      content: 'Demo',
      createdAt: DateTime.now(),
    );
    expect(demoPost.isAuthor('anyuser@workio.lk', null), isTrue);

    // Non-author user fails
    expect(post.isAuthor('stranger@workio.lk', 'Stranger'), isFalse);
  });
}
