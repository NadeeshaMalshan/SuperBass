import 'package:flutter_test/flutter_test.dart';
import 'package:superbass/models/community_post_model.dart';

void main() {
  test('App Community TC-08: Filters post list by query in title or content', () {
    final posts = [
      CommunityPostModel(postId: 1, userId: 'u1', userName: 'User 1', title: 'Need Plumber Colombo', content: 'Bathroom tap leaking', createdAt: DateTime.now()),
      CommunityPostModel(postId: 2, userId: 'u2', userName: 'User 2', title: 'AC Repair Needed', content: 'Compressor issue in Colombo', createdAt: DateTime.now()),
      CommunityPostModel(postId: 3, userId: 'u3', userName: 'User 3', title: 'Garden Maintenance', content: 'Grass cutting service in Kandy', createdAt: DateTime.now()),
    ];

    final query = 'colombo';
    final searchResults = posts.where((p) {
      return p.title.toLowerCase().contains(query) || p.content.toLowerCase().contains(query);
    }).toList();

    expect(searchResults.length, 2);
    expect(searchResults.map((p) => p.postId), containsAll([1, 2]));
  });
}
