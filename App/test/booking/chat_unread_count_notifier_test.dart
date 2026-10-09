import 'package:flutter_test/flutter_test.dart';
import 'package:superbass/services/chat_signalr_service.dart';

void main() {
  group('TC-07: Chat Unread Count & Presence Notifier (App)', () {
    test('setUnreadChatCount updates ValueNotifier correctly', () {
      final chatService = ChatSignalRService();
      expect(chatService.unreadChatCountNotifier.value, isNotNull);

      chatService.setUnreadChatCount(5);
      expect(chatService.unreadChatCountNotifier.value, 5);

      chatService.incrementUnreadChatCount();
      expect(chatService.unreadChatCountNotifier.value, 6);
    });

    test('resetting unread count to 0', () {
      final chatService = ChatSignalRService();
      chatService.setUnreadChatCount(0);
      expect(chatService.unreadChatCountNotifier.value, 0);
    });
  });
}
