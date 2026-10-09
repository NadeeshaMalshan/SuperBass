import 'package:flutter_test/flutter_test.dart';
import 'package:superbass/models/community_post_model.dart';

void main() {
  test('App Community TC-10: Correctly parses ServiceCategoryModel from JSON', () {
    final categoryJson = {
      'id': 'plumbing',
      'name': 'Plumbing',
      'icon': 'plumbing_icon.png',
    };

    final category = ServiceCategoryModel.fromJson(categoryJson);

    expect(category.id, 'plumbing');
    expect(category.name, 'Plumbing');
    expect(category.icon, 'plumbing_icon.png');
  });
}
