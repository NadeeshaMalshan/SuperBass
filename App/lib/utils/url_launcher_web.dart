import 'package:web/web.dart';

Future<void> openUrl(String url) async {
  window.open(url, '_blank');
}
