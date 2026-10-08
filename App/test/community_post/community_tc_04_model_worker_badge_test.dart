import 'package:flutter_test/flutter_test.dart';
import 'package:superbass/models/community_post_model.dart';

void main() {
  test('App Community TC-04: Identifies worker role and trade ratings correctly', () {
    final workerJson = {
      'postId': 5,
      'title': 'Certified Electrician Available',
      'content': 'Available for domestic wiring inspections',
      'role': 'Worker',
      'workerTrade': 'Electrician',
      'rating': 4.8,
      'isAuthorVerified': true,
    };

    final post = CommunityPostModel.fromJson(workerJson);

    expect(post.isWorker, isTrue);
    expect(post.workerTrade, 'Electrician');
    expect(post.workerRating, 4.8);
    expect(post.isAuthorVerified, isTrue);
  });
}
