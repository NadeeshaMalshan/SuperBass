import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:signalr_netcore/signalr_client.dart';
import 'api_config.dart';

class ChatSignalRService {
  static final ChatSignalRService _instance = ChatSignalRService._internal();
  factory ChatSignalRService() => _instance;
  ChatSignalRService._internal();

  HubConnection? _hubConnection;
  String? _connectedEmail;
  int? _currentConversationId;

  final StreamController<Map<String, dynamic>> _messageController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _readController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _typingController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _presenceController =
      StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get onMessageReceived => _messageController.stream;
  Stream<Map<String, dynamic>> get onMessagesRead => _readController.stream;
  Stream<Map<String, dynamic>> get onUserTyping => _typingController.stream;
  Stream<Map<String, dynamic>> get onPresenceChanged => _presenceController.stream;

  bool get isConnected => _hubConnection?.state == HubConnectionState.Connected;

  /// Connect to the SignalR ChatHub over WebSockets
  Future<void> connect(String userEmail) async {
    if (userEmail.isEmpty) return;
    if (_connectedEmail == userEmail && isConnected) return;

    await disconnect();
    _connectedEmail = userEmail;

    final baseUrl = ApiConfig.baseUrl.replaceAll(RegExp(r'/+$'), '');
    final hubUrl = '$baseUrl/chathub?userEmail=${Uri.encodeComponent(userEmail)}';

    debugPrint('Connecting to SignalR WebSocket at: $hubUrl');

    _hubConnection = HubConnectionBuilder()
        .withUrl(
          hubUrl,
          options: HttpConnectionOptions(
            transport: HttpTransportType.WebSockets,
            skipNegotiation: true,
          ),
        )
        .withAutomaticReconnect(retryDelays: [2000, 5000, 10000, 20000])
        .build();

    // Event listeners
    _hubConnection!.on('ReceiveMessage', (arguments) {
      if (arguments != null && arguments.isNotEmpty) {
        try {
          final data = arguments[0];
          if (data is Map) {
            _messageController.add(Map<String, dynamic>.from(data));
          }
        } catch (e) {
          debugPrint('Error processing ReceiveMessage argument: $e');
        }
      }
    });

    _hubConnection!.on('MessagesRead', (arguments) {
      if (arguments != null && arguments.isNotEmpty) {
        try {
          final data = arguments[0];
          if (data is Map) {
            _readController.add(Map<String, dynamic>.from(data));
          }
        } catch (e) {
          debugPrint('Error processing MessagesRead argument: $e');
        }
      }
    });

    _hubConnection!.on('UserTyping', (arguments) {
      if (arguments != null && arguments.isNotEmpty) {
        try {
          final data = arguments[0];
          if (data is Map) {
            _typingController.add(Map<String, dynamic>.from(data));
          }
        } catch (e) {
          debugPrint('Error processing UserTyping argument: $e');
        }
      }
    });

    _hubConnection!.on('UserPresenceChanged', (arguments) {
      if (arguments != null && arguments.isNotEmpty) {
        try {
          final data = arguments[0];
          if (data is Map) {
            _presenceController.add(Map<String, dynamic>.from(data));
          }
        } catch (e) {
          debugPrint('Error processing UserPresenceChanged argument: $e');
        }
      }
    });

    _hubConnection!.onreconnected(({connectionId}) {
      debugPrint('SignalR reconnected: $connectionId');
      if (_currentConversationId != null) {
        joinConversation(_currentConversationId!);
      }
    });

    try {
      await _hubConnection!.start();
      debugPrint('SignalR WebSocket connected successfully!');
      if (_currentConversationId != null) {
        await joinConversation(_currentConversationId!);
      }
    } catch (e) {
      debugPrint('SignalR WebSocket connection failed: $e');
    }
  }

  /// Disconnect SignalR
  Future<void> disconnect() async {
    if (_hubConnection != null) {
      try {
        await _hubConnection!.stop();
      } catch (_) {}
      _hubConnection = null;
    }
    _connectedEmail = null;
    _currentConversationId = null;
  }

  /// Join a conversation room for real-time messages
  Future<void> joinConversation(int conversationId) async {
    _currentConversationId = conversationId;
    if (isConnected) {
      try {
        await _hubConnection!.invoke('JoinConversation', args: [conversationId]);
        debugPrint('Joined SignalR conversation room: conversation_$conversationId');
      } catch (e) {
        debugPrint('Error joining SignalR conversation $conversationId: $e');
      }
    }
  }

  /// Leave conversation room
  Future<void> leaveConversation(int conversationId) async {
    if (_currentConversationId == conversationId) {
      _currentConversationId = null;
    }
    if (isConnected) {
      try {
        await _hubConnection!.invoke('LeaveConversation', args: [conversationId]);
        debugPrint('Left SignalR conversation room: conversation_$conversationId');
      } catch (e) {
        debugPrint('Error leaving SignalR conversation $conversationId: $e');
      }
    }
  }

  /// Send typing indicator over WebSockets
  Future<void> sendTyping(int conversationId, String userEmail, bool isTyping) async {
    if (isConnected) {
      try {
        await _hubConnection!.invoke('SendTyping', args: [conversationId, userEmail, isTyping]);
      } catch (e) {
        debugPrint('Error sending typing via SignalR: $e');
      }
    }
  }

  /// Mark messages as read over WebSockets
  Future<void> markMessagesAsRead(int conversationId, String readerEmail) async {
    if (isConnected) {
      try {
        await _hubConnection!.invoke('MarkMessagesAsRead', args: [conversationId, readerEmail]);
      } catch (e) {
        debugPrint('Error marking as read via SignalR: $e');
      }
    }
  }
}
