import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';
import '../../services/chat_signalr_service.dart';
import '../../widgets/verified_badge.dart';
import '../chat_screen.dart';

class WorkerChatsScreen extends StatefulWidget {
  const WorkerChatsScreen({super.key});

  @override
  State<WorkerChatsScreen> createState() => _WorkerChatsScreenState();
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

  @override
  Widget build(BuildContext context) {
    final filtered = _conversations.where((c) {
      if (_searchQuery.trim().isEmpty) return true;
      final q = _searchQuery.toLowerCase();
      final name = (c['residentName'] ?? c['otherPartyName'] ?? c['workerName'] ?? '').toString().toLowerCase();
      final lastMsg = (c['lastMessage'] ?? '').toString().toLowerCase();
      return name.contains(q) || lastMsg.contains(q);
    }).toList();

    return Container(
      color: Colors.white,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Title
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 14, 20, 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Chats',
                  style: GoogleFonts.dmSans(
                    fontSize: 28,
                    fontWeight: FontWeight.w900,
                    color: Colors.black,
                    letterSpacing: -0.6,
                  ),
                ),
                if (_conversations.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      '${_conversations.length} ${_conversations.length == 1 ? 'chat' : 'chats'}',
                      style: GoogleFonts.dmSans(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF64748B),
                      ),
                    ),
                  ),
              ],
            ),
          ),

          // Search Bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
            child: Container(
              decoration: BoxDecoration(
                color: const Color(0xFFF4F6F8),
                borderRadius: BorderRadius.circular(20),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Row(
                children: [
                  const Icon(Icons.search_rounded, size: 20, color: Color(0xFF94A3B8)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      onChanged: (val) => setState(() => _searchQuery = val),
                      style: GoogleFonts.dmSans(fontSize: 14, color: Colors.black),
                      decoration: InputDecoration(
                        hintText: 'Search chats or clients...',
                        hintStyle: GoogleFonts.dmSans(fontSize: 14, color: const Color(0xFF94A3B8)),
                        border: InputBorder.none,
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                  if (_searchQuery.isNotEmpty)
                    GestureDetector(
                      onTap: () => setState(() => _searchQuery = ''),
                      child: const Icon(Icons.close_rounded, size: 18, color: Color(0xFF94A3B8)),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),

          // Chat list
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Colors.black))
                : RefreshIndicator(
                    onRefresh: _fetchChats,
                    color: Colors.black,
                    backgroundColor: Colors.white,
                    child: filtered.isEmpty
                        ? _buildEmptyState()
                        : ListView.separated(
                            padding: const EdgeInsets.fromLTRB(20, 6, 20, 110),
                            itemCount: filtered.length,
                            separatorBuilder: (_, _) => const Divider(
                              height: 1,
                              color: Color(0xFFF1F5F9),
                              indent: 68,
                            ),
                            itemBuilder: (context, index) {
                              final c = filtered[index];
                              return _buildConversationItem(c);
                            },
                          ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: const BoxDecoration(
                  color: Color(0xFFF1F5F9),
                  shape: BoxShape.circle,
                ),
                child: const Center(
                  child: Icon(Icons.chat_bubble_outline_rounded, size: 30, color: Colors.black),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                _searchQuery.isNotEmpty ? 'No matches found' : 'No messages yet',
                style: GoogleFonts.dmSans(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: Colors.black,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                _searchQuery.isNotEmpty
                    ? 'Try searching with a different client name or keyword.'
                    : 'Conversations with residents and clients will appear here.',
                textAlign: TextAlign.center,
                style: GoogleFonts.dmSans(
                  fontSize: 13,
                  color: const Color(0xFF64748B),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildConversationItem(Map<String, dynamic> c) {
    final clientName = (c['residentName'] ?? 'Client').toString();
    final profileImage = c['residentProfileImage']?.toString();
    final lastMsg = (c['lastMessage'] ?? 'Started a conversation').toString();
    final unread = (c['unreadCount'] is int) ? c['unreadCount'] as int : 0;
    final timeStr = _formatMessageTime(c['updatedAt']?.toString() ?? c['lastMessageAt']?.toString());
    final isOnline = c['isOnline'] == true;

    final isClientVerified = c['isResidentVerified'] == true;

    return InkWell(
      onTap: () async {
        final convId = c['id'] is int ? c['id'] as int : int.tryParse(c['id']?.toString() ?? '0') ?? 0;
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
            // Client Avatar with Online indicator
            Stack(
              clipBehavior: Clip.none,
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: const Color(0xFFF1F5F9),
                  backgroundImage: (profileImage != null && profileImage.isNotEmpty && profileImage != 'null')
                      ? NetworkImage(profileImage)
                      : null,
                  child: (profileImage == null || profileImage.isEmpty || profileImage == 'null')
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

            // Name & Last message preview
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
                      Expanded(
                        child: Text(
                          lastMsg,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.dmSans(
                            fontSize: 13,
                            color: unread > 0 ? const Color(0xFF0F172A) : const Color(0xFF64748B),
                            fontWeight: unread > 0 ? FontWeight.w700 : FontWeight.w400,
                          ),
                        ),
                      ),
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
}
