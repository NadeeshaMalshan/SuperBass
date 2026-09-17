import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_colors.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

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

  List<Map<String, dynamic>> _messages = [];
  bool _isLoading = true;
  bool _showEmoji = false;
  
  bool _isOnline = false;
  String _lastSeenStr = '';

  void _pickImage() {
    // Open gallery logic goes here
    debugPrint('Pick image from gallery');
  }

  @override
  void initState() {
    super.initState();
    _fetchMessages();
  }

  Future<void> _fetchMessages() async {
    final email = AuthService().currentUser?.email;
    if (email == null) {
      setState(() => _isLoading = false);
      return;
    }

    final data = await ApiService().fetchMessages(widget.conversationId, email);
    final convDetails = await ApiService().fetchConversationDetails(widget.conversationId, email);
    
    bool isOnline = false;
    String lastSeenStr = '';
    if (convDetails != null) {
      isOnline = convDetails['isOnline'] == true;
      final lastSeenAt = convDetails['lastSeenAt']?.toString();
      if (lastSeenAt != null && lastSeenAt.isNotEmpty) {
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
      
      processed.add({
        'text': msg['content']?.toString() ?? '',
        'isMe': isMe,
        'isRead': msg['isRead'] == true,
        'timeStr': timeStr,
      });
    }

    if (mounted) {
      setState(() {
        _messages = processed;
        _isOnline = isOnline;
        _lastSeenStr = lastSeenStr;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    // Material 3 colors inspired by Google Messages
    const Color bgSurface = Color(0xFFF3F3F3); // Light grey background
    const Color myBubbleColor = Color(0xFFE5E7EB); // Light grey/black ("kalu patata" light)
    const Color otherBubbleColor = Color(0xFFFEF3C7); // Light yellow ("kala/kaha patata" light)
    const Color sendFabColor = AppColors.brandYellow; // Send button color

    return Scaffold(
      backgroundColor: bgSurface,
      appBar: AppBar(
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
              backgroundImage: widget.profileImage != null && widget.profileImage!.isNotEmpty
                  ? NetworkImage(widget.profileImage!)
                  : null,
              child: widget.profileImage == null || widget.profileImage!.isEmpty
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
                  if (_isOnline || _lastSeenStr.isNotEmpty)
                    Text(
                      _isOnline ? 'Active now' : _lastSeenStr,
                      style: GoogleFonts.dmSans(
                        fontWeight: FontWeight.w400,
                        fontSize: 12,
                        color: _isOnline ? AppColors.success : AppColors.onSurfaceVariant.withValues(alpha: 0.7),
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
                  ? const Center(child: CircularProgressIndicator()) 
                  : ListView.builder(
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
                              color: AppColors.onSurfaceVariant.withOpacity(0.8),
                            ),
                          ),
                        ),
                      );
                    }

                    final isMe = msg['isMe'] == true;
                    final isRead = msg['isRead'] == true;
                    final timeStr = msg['timeStr'] ?? '';

                    return Align(
                      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                      child: Column(
                        crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                        children: [
                          Container(
                            margin: const EdgeInsets.only(bottom: 4),
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            decoration: BoxDecoration(
                              color: isMe ? myBubbleColor : otherBubbleColor,
                              borderRadius: BorderRadius.only(
                                topLeft: const Radius.circular(24),
                                topRight: const Radius.circular(24),
                                bottomLeft: Radius.circular(isMe ? 24 : 8),
                                bottomRight: Radius.circular(isMe ? 8 : 24),
                              ),
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
                              padding: const EdgeInsets.only(bottom: 12, right: 4, left: 4),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    timeStr,
                                    style: GoogleFonts.dmSans(fontSize: 11, color: AppColors.onSurfaceVariant.withValues(alpha: 0.8)),
                                  ),
                                  if (isMe) ...[
                                    const SizedBox(width: 4),
                                    Icon(
                                      isRead ? Icons.done_all : Icons.check,
                                      size: 14,
                                      color: isRead ? AppColors.brandYellowHover : AppColors.onSurfaceVariant.withValues(alpha: 0.8),
                                    ),
                                  ]
                                ],
                              ),
                            )
                        ],
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
                               _fetchMessages();
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
    );
  }
}
