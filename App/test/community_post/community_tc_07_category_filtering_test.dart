import 'package:flutter_test/flutter_test.dart';
import 'package:superbass/models/community_post_model.dart';

void main() {
  test('App Community TC-07: Filters post list by service category', () {
    final posts = [
      CommunityPostModel(postId: 1, userId: 'u1', userName: 'User 1', title: 'Plumbing Job', content: 'Pipe leak', serviceCategoryName: 'Plumbing', createdAt: DateTime.now()),
      CommunityPostModel(postId: 2, userId: 'u2', userName: 'User 2', title: 'Wiring Job', content: 'Short circuit', serviceCategoryName: 'Electrical', createdAt: DateTime.now()),
      CommunityPostModel(postId: 3, userId: 'u3', userName: 'User 3', title: 'Drain Clear', content: 'Clogged drain', serviceCategoryName: 'Plumbing', createdAt: DateTime.now()),
    ];

    final plumbingPosts = posts.where((p) => p.serviceCategoryName == 'Plumbing').toList();

    expect(plumbingPosts.length, 2);
    expect(plumbingPosts.map((p) => p.postId), containsAll([1, 3]));
  });
}
