import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_colors.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../services/chat_signalr_service.dart';
import 'package:loading_indicator_m3e/loading_indicator_m3e.dart';

class ChatScreen extends StatefulWidget {
  final int conversationId;
  final String name;
  final String? profileImage;

  const ChatScreen({
    super.key,
    required this.conversationId,
    required this.name,
    this.profileImage,
  });

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  List<Map<String, dynamic>> _messages = [];
  bool _isLoading = true;
  bool _showEmoji = false;
  
  bool _isOnline = false;
  String _lastSeenStr = '';
  bool _isOtherTyping = false;
  Timer? _typingDebounce;
  Timer? _pollTimer;

  StreamSubscription? _msgSub;
  StreamSubscription? _readSub;
  StreamSubscription? _typingSub;
  StreamSubscription? _presenceSub;

  void _scrollToBottom({bool isInitial = false}) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      final maxScroll = _scrollController.position.maxScrollExtent;
      if (isInitial) {
        _scrollController.jumpTo(maxScroll);
        // Double check after layout settles
        Future.delayed(const Duration(milliseconds: 60), () {
          if (mounted && _scrollController.hasClients) {
            if (_scrollController.offset < _scrollController.position.maxScrollExtent) {
              _scrollController.jumpTo(_scrollController.position.maxScrollExtent);
            }
          }
        });
      } else {
        _scrollController.animateTo(
          maxScroll,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  final Set<int> _selectedMessageIds = {};
  bool get _isSelectionMode => _selectedMessageIds.isNotEmpty;

  void _toggleMessageSelection(int id) {
    if (id <= 0) return;
    setState(() {
      if (_selectedMessageIds.contains(id)) {
        _selectedMessageIds.remove(id);
      } else {
        _selectedMessageIds.add(id);
      }
    });
  }

  void _showDeleteOptions() {
    if (_selectedMessageIds.isEmpty) return;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  '${_selectedMessageIds.length} message(s) selected',
                  style: GoogleFonts.dmSans(
                    fontWeight: FontWeight.w600,
                    fontSize: 16,
                    color: AppColors.onSurface,
                  ),
                ),
                const SizedBox(height: 16),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.delete_outline, color: AppColors.onSurfaceVariant),
                  ),
                  title: Text(
                    'Delete for me',
                    style: GoogleFonts.dmSans(fontWeight: FontWeight.w600, fontSize: 15),
                  ),
                  subtitle: Text(
                    'Delete from your device only',
                    style: GoogleFonts.dmSans(fontSize: 12, color: AppColors.onSurfaceVariant),
                  ),
                  onTap: () {
                    Navigator.pop(ctx);
                    _confirmDeleteForMe();
                  },
                ),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.error.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.undo_rounded, color: AppColors.error),
                  ),
                  title: Text(
                    'Unsend',
                    style: GoogleFonts.dmSans(
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                      color: AppColors.error,
                    ),
                  ),
                  subtitle: Text(
                    'Delete for everyone (only your messages sent within 24h)',
                    style: GoogleFonts.dmSans(fontSize: 12, color: AppColors.onSurfaceVariant),
                  ),
                  onTap: () {
                    Navigator.pop(ctx);
                    _handleUnsend();
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _confirmDeleteForMe() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Delete for me?', style: GoogleFonts.dmSans(fontWeight: FontWeight.w700)),
        content: Text(
          'Are you sure you want to remove ${_selectedMessageIds.length} message(s) from this device?',
          style: GoogleFonts.dmSans(),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel', style: GoogleFonts.dmSans(color: AppColors.onSurfaceVariant)),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              setState(() {
                _messages.removeWhere((m) => _selectedMessageIds.contains(m['id']));
                _selectedMessageIds.clear();
              });
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Message(s) deleted for you')),
              );
            },
            child: Text('Delete', style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, color: AppColors.error)),
          ),
        ],
      ),
    );
  }

  void _handleUnsend() {
    final selectedMsgs = _messages.where((m) => _selectedMessageIds.contains(m['id'])).toList();
    final now = DateTime.now();

    final invalidMsgs = selectedMsgs.where((m) {
      final isOutgoing = m['isMe'] == true;
      if (!isOutgoing) return true; // Can't delete received messages

      final dtStr = m['createdAt']?.toString();
      if (dtStr != null && dtStr.isNotEmpty) {
        try {
          final dt = DateTime.parse(dtStr);
          final diffHours = now.difference(dt).inHours;
          if (diffHours > 24) return true; // Can't delete messages older than 24 hours
        } catch (_) {}
      }
      return false;
    }).toList();

    if (invalidMsgs.isNotEmpty) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Row(
            children: [
              const Icon(Icons.block, color: AppColors.error),
              const SizedBox(width: 8),
              Text('Action Blocked', style: GoogleFonts.dmSans(fontWeight: FontWeight.w700)),
            ],
          ),
          content: Text(
            'You can only unsend your own messages sent within the last 24 hours.',
            style: GoogleFonts.dmSans(),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text('OK', style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, color: AppColors.brandYellowHover)),
            ),
          ],
        ),
      );
      return;
    }

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Unsend message?', style: GoogleFonts.dmSans(fontWeight: FontWeight.w700)),
        content: Text(
          'Are you sure you want to unsend ${_selectedMessageIds.length} message(s)? They will be removed for everyone.',
          style: GoogleFonts.dmSans(),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel', style: GoogleFonts.dmSans(color: AppColors.onSurfaceVariant)),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final email = AuthService().currentUser?.email;
              if (email == null) return;

              final idsToDelete = _selectedMessageIds.toList();
              final success = await ApiService().deleteMessages(idsToDelete, email);
              if (success && mounted) {
                setState(() {
                  _messages.removeWhere((m) => idsToDelete.contains(m['id']));
                  _selectedMessageIds.clear();
                });
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Message(s) unsent successfully')),
                );
              } else if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Failed to unsend message(s). Please try again.')),
                );
              }
            },
            child: Text('Unsend', style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, color: AppColors.error)),
          ),
        ],
      ),
    );
  }

  void _pickImage() {
    // Open gallery logic goes here
    debugPrint('Pick image from gallery');
  }

  @override
  void initState() {
    super.initState();
    _fetchMessages();
    _initSignalR();

    // Fallback polling every 12 seconds in case WebSockets reconnect
    _pollTimer = Timer.periodic(const Duration(seconds: 12), (_) {
      if (mounted) {
        _fetchMessages(isBackground: true);
      }
    });
  }

  void _initSignalR() {
    final userEmail = AuthService().currentUser?.email;
    if (userEmail != null) {
      ChatSignalRService().connect(userEmail).then((_) {
        ChatSignalRService().joinConversation(widget.conversationId);
      });
    }

    _msgSub = ChatSignalRService().onMessageReceived.listen((msg) {
      final convId = msg['conversationId'] is int
          ? msg['conversationId'] as int
          : int.tryParse(msg['conversationId']?.toString() ?? '0') ?? 0;
      if (convId == widget.conversationId && mounted) {
        _fetchMessages(isBackground: true);
        if (userEmail != null) {
          ChatSignalRService().markMessagesAsRead(widget.conversationId, userEmail);
        }
      }
    });

    _readSub = ChatSignalRService().onMessagesRead.listen((event) {
      final convId = event['conversationId'] is int
          ? event['conversationId'] as int
          : int.tryParse(event['conversationId']?.toString() ?? '0') ?? 0;
      if (convId == widget.conversationId && mounted) {
        setState(() {
          for (var m in _messages) {
            if (m['isMe'] == true) {
              m['isRead'] = true;
            }
          }
        });
      }
    });

    _typingSub = ChatSignalRService().onUserTyping.listen((event) {
      final convId = event['conversationId'] is int
          ? event['conversationId'] as int
          : int.tryParse(event['conversationId']?.toString() ?? '0') ?? 0;
      final typingEmail = event['userEmail']?.toString().toLowerCase();
      final myEmail = userEmail?.toLowerCase();
      if (convId == widget.conversationId && typingEmail != myEmail && mounted) {
        setState(() {
          _isOtherTyping = event['isTyping'] == true;
        });
      }
    });

    _presenceSub = ChatSignalRService().onPresenceChanged.listen((event) {
      if (mounted) {
        setState(() {
          _isOnline = event['isOnline'] == true;
        });
      }
    });
  }

  @override
  void dispose() {
    ChatSignalRService().leaveConversation(widget.conversationId);
    _msgSub?.cancel();
    _readSub?.cancel();
    _typingSub?.cancel();
    _presenceSub?.cancel();
    _typingDebounce?.cancel();
    _pollTimer?.cancel();
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _fetchMessages({bool isBackground = false}) async {
    final email = AuthService().currentUser?.email;
    if (email == null) {
      if (mounted) setState(() => _isLoading = false);
      return;
    }

    // Mark messages as read in backend
    ApiService().markConversationAsRead(widget.conversationId, email);

    if (!isBackground && _messages.isEmpty) {
      setState(() => _isLoading = true);
    }

    final data = await ApiService().fetchMessages(widget.conversationId, email);
    final convDetails = await ApiService().fetchConversationDetails(widget.conversationId, email);
    
    bool isOnline = false;
    String lastSeenStr = '';
    if (convDetails != null) {
      isOnline = convDetails['isOnline'] == true;
      String? lastSeenAt = convDetails['lastSeenAt']?.toString();
      

      if (lastSeenAt != null && lastSeenAt.isNotEmpty && lastSeenAt != 'null') {
        try {
          final dt = DateTime.parse(lastSeenAt).toLocal();
          final hour = dt.hour == 0 ? 12 : (dt.hour > 12 ? dt.hour - 12 : dt.hour);
          final minute = dt.minute.toString().padLeft(2, '0');
          final ampm = dt.hour >= 12 ? 'pm' : 'am';
          
          final now = DateTime.now();
          final diff = now.difference(dt);
          if (diff.inDays == 0 && now.day == dt.day) {
            lastSeenStr = 'Last online today at $hour:$minute $ampm';
          } else {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            lastSeenStr = 'Last online ${dt.day} ${months[dt.month - 1]} at $hour:$minute $ampm';
          }
        } catch (_) {}
      }
    }
    
    // Process messages to inject date headers
    final List<Map<String, dynamic>> processed = [];
    String? lastDateStr;

    // API usually returns messages ordered by created_at (ascending or descending).
    // Assuming they are ascending (oldest first). If they are descending, we might need to reverse them.
    // Let's assume we get them ascending.
    for (var msg in data.reversed.toList().reversed) {
      final isMe = msg['senderEmail'] == email;
      final dtStr = msg['createdAt']?.toString();
      
      String timeStr = '';
      if (dtStr != null) {
        try {
          final dt = DateTime.parse(dtStr).toLocal();
          final dateKey = '${dt.year}-${dt.month}-${dt.day}';
          
          final hour = dt.hour == 0 ? 12 : (dt.hour > 12 ? dt.hour - 12 : dt.hour);
          final minute = dt.minute.toString().padLeft(2, '0');
          final ampm = dt.hour >= 12 ? 'pm' : 'am';
          timeStr = '$hour:$minute $ampm';

          if (lastDateStr != dateKey) {
            lastDateStr = dateKey;
            
            // Format header: Thursday, 6 Mar • 11:53 am
            final days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            final headerText = '${days[dt.weekday - 1]}, ${dt.day} ${months[dt.month - 1]} • $timeStr';
            
            processed.add({
              'text': headerText,
              'isHeader': true,
            });
          }
        } catch (_) {}
      }
      
      final id = msg['id'] is int
          ? msg['id'] as int
          : int.tryParse(msg['id']?.toString() ?? '0') ?? 0;

      processed.add({
        'id': id,
        'text': msg['content']?.toString() ?? '',
        'isMe': isMe,
        'isRead': msg['isRead'] == true,
        'timeStr': timeStr,
        'createdAt': dtStr,
        'senderEmail': msg['senderEmail'],
      });
    }

    if (mounted) {
      final bool wasLoading = _isLoading;
      setState(() {
        _messages = processed;
        _isOnline = isOnline;
        _lastSeenStr = lastSeenStr;
        _isLoading = false;
      });

      if (wasLoading || !isBackground) {
        _scrollToBottom(isInitial: true);
      } else if (_scrollController.hasClients) {
        final distanceToBottom =
            _scrollController.position.maxScrollExtent - _scrollController.offset;
        if (distanceToBottom < 200) {
          _scrollToBottom(isInitial: false);
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Material 3 colors inspired by Google Messages
    const Color bgSurface = Color(0xFFF3F3F3); // Light grey background
    const Color myBubbleColor = Color(0xFFE5E7EB); // Light grey/black ("kalu patata" light)
    const Color otherBubbleColor = Color(0xFFFEF3C7); // Light yellow ("kala/kaha patata" light)
    const Color sendFabColor = AppColors.brandYellow; // Send button color

    return PopScope(
      canPop: !_isSelectionMode,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        if (_isSelectionMode) {
          setState(() {
            _selectedMessageIds.clear();
          });
        }
      },
      child: Scaffold(
      backgroundColor: bgSurface,
      appBar: _isSelectionMode
          ? AppBar(
              backgroundColor: Colors.white,
              elevation: 1,
              leading: IconButton(
                icon: const Icon(Icons.close, color: AppColors.onSurface),
                onPressed: () {
                  setState(() {
                    _selectedMessageIds.clear();
                  });
                },
              ),
              titleSpacing: 0,
              title: Text(
                '${_selectedMessageIds.length} selected',
                style: GoogleFonts.dmSans(
                  fontWeight: FontWeight.w700,
                  fontSize: 18,
                  color: AppColors.onSurface,
                ),
              ),
              actions: [
                IconButton(
                  icon: const Icon(Icons.delete_outline, color: AppColors.error),
                  tooltip: 'Delete options',
                  onPressed: _showDeleteOptions,
                ),
              ],
            )
          : AppBar(
        backgroundColor: bgSurface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.onSurface),
          onPressed: () => Navigator.pop(context),
        ),
        titleSpacing: 0,
        title: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: AppColors.outlineVariant,
              backgroundImage: widget.profileImage != null && widget.profileImage!.isNotEmpty && widget.profileImage != 'null'
                  ? NetworkImage(widget.profileImage!)
                  : null,
              child: widget.profileImage == null || widget.profileImage!.isEmpty || widget.profileImage == 'null'
                  ? Text(
                      widget.name.isNotEmpty ? widget.name[0].toUpperCase() : 'W',
                      style: GoogleFonts.dmSans(
                        fontWeight: FontWeight.w700,
                        color: AppColors.onSurfaceVariant,
                      ),
                    )
                  : null,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    widget.name,
                    style: GoogleFonts.dmSans(
                      fontWeight: FontWeight.w400,
                      fontSize: 18,
                      color: AppColors.onSurface,
                    ),
                  ),
                  if (_isOtherTyping)
                    Text(
                      'typing...',
                      style: GoogleFonts.dmSans(
                        fontWeight: FontWeight.w600,
                        fontSize: 12,
                        fontStyle: FontStyle.italic,
                        color: AppColors.brandYellowHover,
                      ),
                    )
                  else if (_isOnline)
                    Text(
                      'Active now',
                      style: GoogleFonts.dmSans(
                        fontWeight: FontWeight.w400,
                        fontSize: 12,
                        color: AppColors.success,
                      ),
                    )
                  else if (_lastSeenStr.isNotEmpty)
                    Text(
                      _lastSeenStr,
                      style: GoogleFonts.dmSans(
                        fontWeight: FontWeight.w400,
                        fontSize: 12,
                        color: AppColors.onSurfaceVariant.withValues(alpha: 0.7),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.more_vert, color: AppColors.onSurfaceVariant),
            onPressed: () {},
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
              ),
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
                child: _isLoading 
                  ? const Center(child: LoadingIndicatorM3E()) 
                  : ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
                  itemCount: _messages.length,
                  itemBuilder: (context, index) {
                    final msg = _messages[index];
                    if (msg['isHeader'] == true) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 24.0),
                        child: Center(
                          child: Text(
                            msg['text'],
                            style: GoogleFonts.dmSans(
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                              color: AppColors.onSurfaceVariant.withValues(alpha: 0.8),
                            ),
                          ),
                        ),
                      );
                    }

                    final id = msg['id'] is int
                        ? msg['id'] as int
                        : int.tryParse(msg['id']?.toString() ?? '0') ?? 0;
                    final isMe = msg['isMe'] == true;
                    final isRead = msg['isRead'] == true;
                    final timeStr = msg['timeStr'] ?? '';
                    final isSelected = _selectedMessageIds.contains(id);

                    return InkWell(
                      onLongPress: () {
                        if (id > 0) {
                          _toggleMessageSelection(id);
                        }
                      },
                      onTap: () {
                        if (_isSelectionMode) {
                          if (id > 0) {
                            _toggleMessageSelection(id);
                          }
                        }
                      },
                      splashColor: Colors.transparent,
                      highlightColor: Colors.transparent,
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 2),
                        child: Row(
                          mainAxisAlignment:
                              isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            if (_isSelectionMode && !isMe) ...[
                              Padding(
                                padding: const EdgeInsets.only(right: 10),
                                child: Icon(
                                  isSelected
                                      ? Icons.check_circle
                                      : Icons.radio_button_unchecked,
                                  color: isSelected
                                      ? AppColors.brandYellow
                                      : AppColors.outlineVariant,
                                  size: 22,
                                ),
                              ),
                            ],
                            Flexible(
                              child: Column(
                                crossAxisAlignment: isMe
                                    ? CrossAxisAlignment.end
                                    : CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    margin: const EdgeInsets.only(bottom: 4),
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 16, vertical: 12),
                                    decoration: BoxDecoration(
                                      color: isSelected
                                          ? (isMe
                                              ? const Color(0xFFD1D5DB)
                                              : const Color(0xFFFDE68A))
                                          : (isMe ? myBubbleColor : otherBubbleColor),
                                      borderRadius: BorderRadius.only(
                                        topLeft: const Radius.circular(24),
                                        topRight: const Radius.circular(24),
                                        bottomLeft: Radius.circular(isMe ? 24 : 8),
                                        bottomRight: Radius.circular(isMe ? 8 : 24),
                                      ),
                                      border: isSelected
                                          ? Border.all(
                                              color: AppColors.brandYellow, width: 2)
                                          : null,
                                    ),
                                    child: Text(
                                      msg['text'],
                                      style: GoogleFonts.dmSans(
                                        fontSize: 15,
                                        color: const Color(0xFF1C1B1F),
                                        fontWeight: FontWeight.w400,
                                      ),
                                    ),
                                  ),
                                  if (timeStr.toString().isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(
                                          bottom: 12, right: 4, left: 4),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Text(
                                            timeStr,
                                            style: GoogleFonts.dmSans(
                                                fontSize: 11,
                                                color: AppColors.onSurfaceVariant
                                                    .withValues(alpha: 0.8)),
                                          ),
                                          if (isMe) ...[
                                            const SizedBox(width: 4),
                                            Icon(
                                              isRead ? Icons.done_all : Icons.check,
                                              size: 14,
                                              color: isRead
                                                  ? AppColors.brandYellowHover
                                                  : AppColors.onSurfaceVariant
                                                      .withValues(alpha: 0.8),
                                            ),
                                          ]
                                        ],
                                      ),
                                    )
                                ],
                              ),
                            ),
                            if (_isSelectionMode && isMe) ...[
                              Padding(
                                padding: const EdgeInsets.only(left: 10),
                                child: Icon(
                                  isSelected
                                      ? Icons.check_circle
                                      : Icons.radio_button_unchecked,
                                  color: isSelected
                                      ? AppColors.brandYellow
                                      : AppColors.outlineVariant,
                                  size: 22,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
          ),
          // Input Area
          Container(
            color: Colors.white,
            padding: const EdgeInsets.only(left: 16, right: 16, bottom: 24, top: 8),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_showEmoji)
                  Container(
                    height: 50,
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      children: ['👍', '❤️', '😂', '🔥', '🙏', '😊', '😍', '🎉', '💪', '💯']
                          .map((emoji) => InkWell(
                                onTap: () {
                                  _messageController.text += emoji;
                                },
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 12.0),
                                  child: Center(
                                    child: Text(
                                      emoji,
                                      style: const TextStyle(fontSize: 24),
                                    ),
                                  ),
                                ),
                              ))
                          .toList(),
                    ),
                  ),
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        height: 48,
                        decoration: BoxDecoration(
                          color: AppColors.surfaceVariant,
                          borderRadius: BorderRadius.circular(24),
                        ),
                        child: Row(
                          children: [
                            const SizedBox(width: 4),
                            IconButton(
                              icon: const Icon(Icons.add_circle_outline, color: AppColors.onSurfaceVariant),
                              onPressed: _pickImage,
                            ),
                            Expanded(
                              child: TextField(
                                controller: _messageController,
                                onTap: () {
                                  Future.delayed(const Duration(milliseconds: 300), () {
                                    if (mounted) _scrollToBottom(isInitial: false);
                                  });
                                },
                                onChanged: (text) {
                                  final email = AuthService().currentUser?.email;
                                  if (email != null) {
                                    ChatSignalRService().sendTyping(widget.conversationId, email, text.trim().isNotEmpty);
                                    _typingDebounce?.cancel();
                                    _typingDebounce = Timer(const Duration(seconds: 3), () {
                                      ChatSignalRService().sendTyping(widget.conversationId, email, false);
                                    });
                                  }
                                },
                                decoration: InputDecoration(
                                  hintText: 'Text message',
                                  hintStyle: GoogleFonts.dmSans(
                                    color: AppColors.onSurfaceVariant,
                                    fontSize: 15,
                                  ),
                                  border: InputBorder.none,
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 8),
                                ),
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.sentiment_satisfied_alt, color: AppColors.onSurfaceVariant),
                              onPressed: () {
                                setState(() {
                                  _showEmoji = !_showEmoji;
                                });
                                if (_showEmoji) {
                                  Future.delayed(const Duration(milliseconds: 150), () {
                                    if (mounted) _scrollToBottom(isInitial: false);
                                  });
                                }
                              },
                            ),
                            const SizedBox(width: 4),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    InkWell(
                      onTap: () async {
                        if (_messageController.text.trim().isNotEmpty) {
                          final text = _messageController.text.trim();
                          final email = AuthService().currentUser?.email;
                          
                          setState(() {
                            _messageController.clear();
                            _showEmoji = false;
                          });
                          
                          if (email != null) {
                             final sent = await ApiService().sendMessage(
                               conversationId: widget.conversationId,
                               content: text,
                               senderEmail: email,
                             );
                             if (sent != null) {
                               await _fetchMessages(isBackground: true);
                               _scrollToBottom(isInitial: false);
                             }
                          }
                        }
                      },
                      child: Container(
                        width: 48,
                        height: 48,
                        decoration: const BoxDecoration(
                          color: sendFabColor,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.send_rounded, color: AppColors.onPrimary),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    ),
    );
  }
}
