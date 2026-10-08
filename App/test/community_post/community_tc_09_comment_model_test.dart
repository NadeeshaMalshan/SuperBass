import 'package:flutter_test/flutter_test.dart';
import 'package:superbass/models/community_post_model.dart';

void main() {
  test('App Community TC-09: Correctly deserializes CommunityCommentModel from JSON', () {
    final commentJson = {
      'commentId': 15,
      'postId': 101,
      'userId': 'worker@workio.lk',
      'userName': 'Nimal Technician',
      'userAvatar': 'https://res.cloudinary.com/nimal.jpg',
      'content': 'I have the replacement valves in stock.',
      'createdAt': '2026-10-06T14:15:00Z',
      'isUserVerified': true,
    };

    final comment = CommunityCommentModel.fromJson(commentJson);

    expect(comment.commentId, 15);
    expect(comment.postId, 101);
    expect(comment.userId, 'worker@workio.lk');
    expect(comment.userName, 'Nimal Technician');
    expect(comment.content, 'I have the replacement valves in stock.');
    expect(comment.isUserVerified, isTrue);
  });
}
