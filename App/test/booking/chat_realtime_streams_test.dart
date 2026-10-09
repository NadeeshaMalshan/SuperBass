import 'package:flutter_test/flutter_test.dart';
import 'package:superbass/services/chat_signalr_service.dart';

void main() {
  group('TC-08: Chat Real-Time Message Streams (App)', () {
    test('exposes onMessageReceived and onMessagesRead broadcast streams', () {
      final chatService = ChatSignalRService();

      expect(chatService.onMessageReceived, isNotNull);
      expect(chatService.onMessagesRead, isNotNull);
      expect(chatService.onUserTyping, isNotNull);
      expect(chatService.onPresenceChanged, isNotNull);

      // Verify streams are broadcast (support multiple listeners)
      expect(chatService.onMessageReceived.isBroadcast, isTrue);
    });
  });
}
