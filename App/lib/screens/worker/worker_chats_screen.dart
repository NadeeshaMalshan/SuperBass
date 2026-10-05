import 'dart:convert';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';
import '../../services/chat_signalr_service.dart';
import '../../widgets/verified_badge.dart';
import '../../widgets/worker_contact_card.dart';
import '../chat_screen.dart';

class WorkerChatsScreen extends StatefulWidget {
  const WorkerChatsScreen({super.key});

  @override
  _WorkerChatsScreenState createState() => _WorkerChatsScreenState();
}

class _WorkerChatsScreenState extends State<WorkerChatsScreen> {
  List<Map<String, dynamic>> _conversations = [];
  bool _isLoading = true;
  String _searchQuery = '';
  StreamSubscription? _msgSub;
  StreamSubscription? _readSub;

  @override
  void initState() {
    super.initState();
    _fetchChats();
    _msgSub = ChatSignalRService().onMessageReceived.listen((_) {
      if (mounted) _fetchChats();
    });
    _readSub = ChatSignalRService().onMessagesRead.listen((_) {
      if (mounted) _fetchChats();
    });
  }

  @override
  void dispose() {
    _msgSub?.cancel();
    _readSub?.cancel();
    super.dispose();
  }

  Future<void> _fetchChats() async {
    final email = AuthService().currentUser?.email;
    if (email == null || email.isEmpty) {
      if (mounted) {
        setState(() {
          _conversations = [];
          _isLoading = false;
        });
      }
      return;
    }

    try {
      final convs = await ApiService().fetchConversations(email);
      int totalUnread = 0;
      for (final c in convs) {
        if (c['unreadCount'] is int) {
          totalUnread += c['unreadCount'] as int;
        }
      }
      ChatSignalRService().setUnreadChatCount(totalUnread);

      if (mounted) {
        setState(() {
          _conversations = convs;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Error fetching worker chats: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _formatMessageTime(String? dateStr) {
    if (dateStr == null) return '';
    try {
      final dt = DateTime.parse(dateStr).toLocal();
      final now = DateTime.now();
      final diff = now.difference(dt);
      if (diff.inDays == 0 && now.day == dt.day) {
        final hour = dt.hour == 0 ? 12 : (dt.hour > 12 ? dt.hour - 12 : dt.hour);
        final minute = dt.minute.toString().padLeft(2, '0');
        final ampm = dt.hour >= 12 ? 'pm' : 'am';
        return '$hour:$minute $ampm';
      } else if (diff.inDays < 7 && diff.inDays >= 0) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days[dt.weekday % 7];
      } else {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return '${dt.day} ${months[dt.month - 1]}';
      }
    } catch (_) {
      return '';
    }
  }

  Widget _buildMessageDisplay(
    String lastMsg,
    BuildContext context,
    Map<String, dynamic> c,
    int unreadCount,
  ) {
    if (lastMsg.trimLeft().startsWith('{')) {
      try {
        final decoded = jsonDecode(lastMsg);
        if (decoded is Map &&
            (decoded.containsKey('phoneNo') || decoded.containsKey('PhoneNo'))) {
          return Text(
            'Shared contact card',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.dmSans(
              fontSize: 13,
              color: unreadCount > 0 ? const Color(0xFF0F172A) : const Color(0xFF64748B),
              fontWeight: unreadCount > 0 ? FontWeight.w700 : FontWeight.w400,
              fontStyle: FontStyle.italic,
            ),
          );
        }
      } catch (_) {
        // fall through to text display
      }
    }
    return Text(
      lastMsg,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: GoogleFonts.dmSans(
        fontSize: 13,
        color: unreadCount > 0 ? const Color(0xFF0F172A) : const Color(0xFF64748B),
        fontWeight: unreadCount > 0 ? FontWeight.w700 : FontWeight.w400,
      ),
    );
  }

  Widget _buildConversationItem(Map<String, dynamic> c) {
    final clientName = (c['residentName'] ?? 'Client').toString();
    final profileImage = c['residentProfileImage']?.toString();
    final String lastMsg = (c['lastMessage'] ?? 'Started a conversation').toString();
    final int unread = (c['unreadCount'] is int) ? c['unreadCount'] as int : 0;
    final String timeStr = _formatMessageTime(
      c['updatedAt']?.toString() ?? c['lastMessageAt']?.toString(),
    );
    final bool isOnline = c['isOnline'] == true;
    final bool isClientVerified = c['isResidentVerified'] == true;

    final Widget messageWidget = _buildMessageDisplay(lastMsg, context, c, unread);

    return InkWell(
      onTap: () async {
        final int convId = c['id'] is int
            ? c['id'] as int
            : int.tryParse(c['id']?.toString() ?? '') ?? 0;
        final userEmail = AuthService().currentUser?.email;

        // Optimistically mark as read
        setState(() {
          c['unreadCount'] = 0;
        });

        if (userEmail != null && convId > 0) {
          ApiService().markConversationAsRead(convId, userEmail);
        }

        await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => ChatScreen(
              conversationId: convId,
              name: clientName,
              profileImage: profileImage,
              isVerified: isClientVerified,
            ),
          ),
        );
        _fetchChats();
      },
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
        child: Row(
          children: [
            // Client Avatar with optional online indicator
            Stack(
              clipBehavior: Clip.none,
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: const Color(0xFFF1F5F9),
                  backgroundImage: (profileImage != null &&
                          profileImage.isNotEmpty &&
                          profileImage != 'null')
                      ? NetworkImage(profileImage)
                      : null,
                  child: (profileImage == null ||
                          profileImage.isEmpty ||
                          profileImage == 'null')
                      ? Text(
                          clientName.isNotEmpty ? clientName[0].toUpperCase() : 'C',
                          style: GoogleFonts.dmSans(
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                            color: Colors.black,
                          ),
                        )
                      : null,
                ),
                if (isOnline)
                  Positioned(
                    right: 0,
                    bottom: 0,
                    child: Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(width: 14),

            // Name & last message preview
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            Flexible(
                              child: Text(
                                clientName,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.dmSans(
                                  fontSize: 15,
                                  fontWeight: unread > 0 ? FontWeight.w800 : FontWeight.w700,
                                  color: Colors.black,
                                ),
                              ),
                            ),
                            if (isClientVerified) const VerifiedBadge(size: 14),
                          ],
                        ),
                      ),
                      if (timeStr.isNotEmpty)
                        Text(
                          timeStr,
                          style: GoogleFonts.dmSans(
                            fontSize: 11.5,
                            fontWeight: unread > 0 ? FontWeight.w700 : FontWeight.w500,
                            color: unread > 0 ? Colors.black : const Color(0xFF94A3B8),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Expanded(child: messageWidget),
                      if (unread > 0) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                          decoration: const BoxDecoration(
                            color: Colors.black,
                            shape: BoxShape.circle,
                          ),
                          child: Text(
                            '$unread',
                            style: GoogleFonts.dmSans(
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ],
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

  @override
  Widget build(BuildContext context) {
    final filtered = _searchQuery.isEmpty
        ? _conversations
        : _conversations.where((c) {
            final name = (c['residentName'] ?? '').toString().toLowerCase();
            return name.contains(_searchQuery.toLowerCase());
          }).toList();

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text(
          'Messages',
          style: GoogleFonts.dmSans(
            fontSize: 20,
            fontWeight: FontWeight.w800,
            color: Colors.black,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(56),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: TextField(
              onChanged: (v) => setState(() => _searchQuery = v),
              decoration: InputDecoration(
                hintText: 'Search clients…',
                hintStyle: GoogleFonts.dmSans(color: const Color(0xFF94A3B8)),
                prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF94A3B8)),
                filled: true,
                fillColor: const Color(0xFFF8FAFC),
                contentPadding: const EdgeInsets.symmetric(vertical: 0),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : filtered.isEmpty
              ? Center(
                  child: Text(
                    _searchQuery.isEmpty ? 'No conversations yet' : 'No results found',
                    style: GoogleFonts.dmSans(
                      fontSize: 15,
                      color: const Color(0xFF94A3B8),
                    ),
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  itemCount: filtered.length,
                  separatorBuilder: (_, __) => const Divider(height: 1, color: Color(0xFFF1F5F9)),
                  itemBuilder: (_, i) => _buildConversationItem(filtered[i]),
                ),
    );
  }
}