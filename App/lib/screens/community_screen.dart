import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:loading_indicator_m3e/loading_indicator_m3e.dart';
import '../data/sri_lanka_locations.dart';
import '../models/auth_user.dart';
import '../models/community_post_model.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../theme/app_colors.dart';

class CommunityScreen extends StatefulWidget {
  final bool isWorkerMode;
  const CommunityScreen({super.key, this.isWorkerMode = false});

  @override
  State<CommunityScreen> createState() => _CommunityScreenState();
}

class _CommunityScreenState extends State<CommunityScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<CommunityPostModel> _allPosts = [];
  List<CommunityPostModel> _myPosts = [];
  List<ServiceCategoryModel> _categories = [];
  bool _isLoading = true;
  String _selectedCategory = 'All';
  String _searchQuery = '';
  String _sortBy = 'latest'; // 'latest' or 'popular'
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadInitialData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadInitialData() async {
    setState(() => _isLoading = true);
    await Future.wait([
      _fetchCategories(),
      _fetchPosts(),
    ]);
    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _fetchCategories() async {
    final cats = await ApiService().fetchCommunityCategories();
    if (mounted) {
      setState(() {
        _categories = cats;
      });
    }
  }

  Future<void> _fetchPosts() async {
    final currentUserEmail = AuthService().currentUser?.email;

    final posts = await ApiService().fetchCommunityPosts(
      category: _selectedCategory,
      search: _searchQuery,
      sort: _sortBy,
    );

    List<CommunityPostModel> userPosts = [];
    if (currentUserEmail != null && currentUserEmail.isNotEmpty) {
      userPosts = await ApiService().fetchUserCommunityPosts(currentUserEmail);
    }

    if (mounted) {
      setState(() {
        _allPosts = posts;
        _myPosts = userPosts;
      });
    }
  }

  void _onCategorySelected(String categoryId) {
    setState(() {
      _selectedCategory = categoryId;
    });
    _fetchPosts();
  }

  void _onSearchChanged(String query) {
    setState(() {
      _searchQuery = query;
    });
    _fetchPosts();
  }

  void _toggleSort() {
    setState(() {
      _sortBy = _sortBy == 'latest' ? 'popular' : 'latest';
    });
    _fetchPosts();
  }

  // Handle Create or Edit Post Sheet
  void _showPostDialog({CommunityPostModel? postToEdit}) {
    final isEditing = postToEdit != null;
    final titleController = TextEditingController(text: postToEdit?.title ?? '');
    final contentController = TextEditingController(text: postToEdit?.content ?? '');
    final imageController = TextEditingController(
      text: (postToEdit?.images != null && postToEdit!.images.isNotEmpty) ? postToEdit.images.first : '',
    );
    String selectedCatId = postToEdit?.serviceCategoryId.isNotEmpty == true ? postToEdit!.serviceCategoryId : 'general';

    // Parse existing location into District & DS Division
    String? selectedDistrict;
    String? selectedDsDivision;
    if (postToEdit?.location != null && postToEdit!.location.isNotEmpty) {
      final parts = postToEdit.location.split(',').map((e) => e.trim()).toList();
      if (parts.length >= 2) {
        final potentialDs = parts[0];
        final potentialDist = parts[1];
        if (SriLankaLocations.districts.contains(potentialDist)) {
          selectedDistrict = potentialDist;
          if (SriLankaLocations.getDsDivisions(potentialDist).contains(potentialDs)) {
            selectedDsDivision = potentialDs;
          }
        }
      } else if (parts.length == 1) {
        if (SriLankaLocations.districts.contains(parts[0])) {
          selectedDistrict = parts[0];
        }
      }
    }
    selectedDistrict ??= 'Colombo';

    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (modalCtx, setModalState) {
          final currentDistrictDsList = SriLankaLocations.getDsDivisions(selectedDistrict);
          final hasImage = imageController.text.trim().isNotEmpty;

          return Padding(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(modalCtx).viewInsets.bottom,
            ),
            child: Container(
              decoration: const BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: const EdgeInsets.all(24),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: AppColors.outlineVariant,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          isEditing ? 'Edit Community Post' : 'Create Community Post',
                          style: GoogleFonts.dmSans(
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                            color: AppColors.onSurface,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.pop(modalCtx),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Category Selector
                    Text(
                      'Category',
                      style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 13),
                    ),
                    const SizedBox(height: 6),
                    Builder(
                      builder: (context) {
                        final Map<String, String> categoryOptions = {
                          'general': 'General Advice',
                        };
                        for (var c in _categories) {
                          if (c.id.isNotEmpty && c.name.isNotEmpty) {
                            categoryOptions[c.id] = c.name;
                          }
                        }

                        final effectiveValue = categoryOptions.keys.firstWhere(
                          (k) => k.toLowerCase() == selectedCatId.toLowerCase(),
                          orElse: () => categoryOptions.keys.first,
                        );

                        return DropdownButtonFormField<String>(
                          initialValue: effectiveValue,
                          decoration: InputDecoration(
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          ),
                          items: categoryOptions.entries.map((entry) {
                            return DropdownMenuItem<String>(
                              value: entry.key,
                              child: Text(entry.value),
                            );
                          }).toList(),
                          onChanged: (val) {
                            if (val != null) {
                              setModalState(() => selectedCatId = val);
                            }
                          },
                        );
                      },
                    ),
                    const SizedBox(height: 14),

                    // Title
                    Text(
                      'Title',
                      style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 13),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: titleController,
                      decoration: InputDecoration(
                        hintText: 'e.g., Looking for a reliable electrician in Homagama',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Location - District & Divisional Secretariat Section
                    Text(
                      'Location (District & DS Division)',
                      style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 13),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        // District Dropdown
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: SriLankaLocations.districts.contains(selectedDistrict) ? selectedDistrict : SriLankaLocations.districts.first,
                            decoration: InputDecoration(
                              labelText: 'District',
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            ),
                            items: SriLankaLocations.districts.map((dist) {
                              return DropdownMenuItem<String>(
                                value: dist,
                                child: Text(dist, overflow: TextOverflow.ellipsis),
                              );
                            }).toList(),
                            onChanged: (val) {
                              if (val != null) {
                                setModalState(() {
                                  selectedDistrict = val;
                                  selectedDsDivision = null;
                                });
                              }
                            },
                          ),
                        ),
                        const SizedBox(width: 10),
                        // DS Division Dropdown
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: currentDistrictDsList.contains(selectedDsDivision) ? selectedDsDivision : null,
                            hint: Text('DS Division', style: GoogleFonts.dmSans(fontSize: 13)),
                            decoration: InputDecoration(
                              labelText: 'DS Division',
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            ),
                            items: currentDistrictDsList.map((ds) {
                              return DropdownMenuItem<String>(
                                value: ds,
                                child: Text(ds, overflow: TextOverflow.ellipsis),
                              );
                            }).toList(),
                            onChanged: (val) {
                              setModalState(() => selectedDsDivision = val);
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Content
                    Text(
                      'Description / Details',
                      style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 13),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: contentController,
                      maxLines: 4,
                      decoration: InputDecoration(
                        hintText: 'Describe what service, recommendation, or advice you are seeking...',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: AppColors.outlineVariant),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: AppColors.brandYellow, width: 2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Image Attachment Section (Upload Only)
                    Text(
                      'Image Attachment (Optional)',
                      style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 13),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      decoration: BoxDecoration(
                        color: AppColors.surfaceVariant.withValues(alpha: 0.3),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.outlineVariant),
                      ),
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          OutlinedButton.icon(
                            onPressed: () async {
                              final ImagePicker picker = ImagePicker();
                              final XFile? file = await picker.pickImage(
                                source: ImageSource.gallery,
                                maxWidth: 1024,
                                maxHeight: 1024,
                                imageQuality: 85,
                              );
                              if (file != null) {
                                final bytes = await file.readAsBytes();
                                final mime = file.mimeType ?? 'image/jpeg';
                                final base64Str = base64Encode(bytes);
                                final dataUri = 'data:$mime;base64,$base64Str';
                                setModalState(() {
                                  imageController.text = dataUri;
                                });
                              }
                            },
                            icon: const Icon(Icons.add_a_photo_outlined),
                            label: Text(hasImage ? 'Change Selected Photo' : 'Attach Photo from Device'),
                            style: OutlinedButton.styleFrom(
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                          ),

                          // Image Preview Thumbnail
                          if (hasImage) ...[
                            const SizedBox(height: 12),
                            Stack(
                              children: [
                                Container(
                                  height: 120,
                                  width: double.infinity,
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(color: AppColors.outlineVariant),
                                  ),
                                  child: ClipRRect(
                                    borderRadius: BorderRadius.circular(10),
                                    child: imageController.text.startsWith('data:image/')
                                        ? Image.memory(
                                            base64Decode(imageController.text.split(',').last),
                                            fit: BoxFit.cover,
                                            errorBuilder: (_, _, _) => const Center(child: Icon(Icons.broken_image)),
                                          )
                                        : Image.network(
                                            imageController.text,
                                            fit: BoxFit.cover,
                                            errorBuilder: (_, _, _) => const Center(child: Icon(Icons.broken_image)),
                                          ),
                                  ),
                                ),
                                Positioned(
                                  top: 6,
                                  right: 6,
                                  child: CircleAvatar(
                                    backgroundColor: Colors.black54,
                                    radius: 14,
                                    child: IconButton(
                                      padding: EdgeInsets.zero,
                                      icon: const Icon(Icons.close, size: 16, color: Colors.white),
                                      onPressed: () {
                                        setModalState(() {
                                          imageController.clear();
                                        });
                                      },
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Submit Button
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.brandYellow,
                          foregroundColor: Colors.black,
                          shape: const StadiumBorder(),
                        ),
                        onPressed: isSubmitting
                            ? null
                            : () async {
                                final title = titleController.text.trim();
                                final content = contentController.text.trim();
                                final constructedLocation = (selectedDsDivision != null && selectedDsDivision!.isNotEmpty)
                                    ? '$selectedDsDivision, ${selectedDistrict ?? "Colombo"}'
                                    : (selectedDistrict ?? 'Colombo');
                                final imageUrl = imageController.text.trim();

                                if (title.isEmpty || content.isEmpty) {
                                  ScaffoldMessenger.of(modalCtx).showSnackBar(
                                    const SnackBar(content: Text('Please enter both Title and Content')),
                                  );
                                  return;
                                }

                                setModalState(() => isSubmitting = true);

                                final imagesList = imageUrl.isNotEmpty ? [imageUrl] : <String>[];

                                CommunityPostModel? result;
                                final scaffoldMessenger = ScaffoldMessenger.of(context);
                                final navigator = Navigator.of(modalCtx);

                                if (isEditing) {
                                  result = await ApiService().updateCommunityPost(
                                    id: postToEdit.postId,
                                    title: title,
                                    content: content,
                                    serviceCategoryId: selectedCatId,
                                    location: constructedLocation,
                                    images: imagesList,
                                  );
                                } else {
                                  result = await ApiService().createCommunityPost(
                                    title: title,
                                    content: content,
                                    serviceCategoryId: selectedCatId,
                                    location: constructedLocation,
                                    images: imagesList,
                                  );
                                }

                                if (modalCtx.mounted) {
                                  navigator.pop();
                                }
                                if (mounted) {
                                  if (result != null) {
                                    scaffoldMessenger.showSnackBar(
                                      SnackBar(
                                        content: Text(
                                          isEditing ? 'Post updated successfully!' : 'Post created successfully!',
                                        ),
                                        backgroundColor: AppColors.success,
                                      ),
                                    );
                                    _fetchPosts();
                                  } else {
                                    scaffoldMessenger.showSnackBar(
                                      const SnackBar(
                                        content: Text('Failed to save post. Please try again.'),
                                        backgroundColor: AppColors.error,
                                      ),
                                    );
                                  }
                                }
                              },
                        child: isSubmitting
                            ? const SizedBox(width: 24, height: 24, child: LoadingIndicatorM3E())
                            : Text(
                                isEditing ? 'Update Post' : 'Publish Community Post',
                                style: GoogleFonts.dmSans(fontSize: 16, fontWeight: FontWeight.w700),
                              ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  // Handle Delete Post Confirmation
  void _confirmDeletePost(CommunityPostModel post) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Delete Post', style: GoogleFonts.dmSans(fontWeight: FontWeight.w700)),
        content: Text('Are you sure you want to delete "${post.title}"? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error, foregroundColor: Colors.white),
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await ApiService().deleteCommunityPost(post.postId);
              if (mounted) {
                if (success) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Post deleted successfully'), backgroundColor: AppColors.success),
                  );
                  _fetchPosts();
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Failed to delete post'), backgroundColor: AppColors.error),
                  );
                }
              }
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  // Handle Report Post Dialog
  void _showReportDialog(CommunityPostModel post) {
    final reasonController = TextEditingController();
    String selectedReason = 'Spam / Advertising';
    final reasons = ['Spam / Advertising', 'Inappropriate Content', 'Off-topic', 'Harassment', 'Other'];

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (dialogCtx, setDialogState) {
          return AlertDialog(
            title: Text('Report Community Post', style: GoogleFonts.dmSans(fontWeight: FontWeight.w700)),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Select reason for reporting this post to moderators:'),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: selectedReason,
                  decoration: const InputDecoration(border: OutlineInputBorder()),
                  items: reasons.map((r) => DropdownMenuItem(value: r, child: Text(r))).toList(),
                  onChanged: (val) {
                    if (val != null) setDialogState(() => selectedReason = val);
                  },
                ),
                if (selectedReason == 'Other') ...[
                  const SizedBox(height: 12),
                  TextField(
                    controller: reasonController,
                    decoration: const InputDecoration(
                      hintText: 'Explain the issue...',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ],
              ],
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(dialogCtx), child: const Text('Cancel')),
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.brandYellow, foregroundColor: Colors.black),
                onPressed: () async {
                  final finalReason = selectedReason == 'Other' ? reasonController.text.trim() : selectedReason;
                  Navigator.pop(dialogCtx);
                  final success = await ApiService().reportCommunityPost(postId: post.postId, reason: finalReason);
                  if (mounted) {
                    if (success) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Report submitted to community moderators. Thank you!')),
                      );
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Failed to submit report. Please try again.')),
                      );
                    }
                  }
                },
                child: const Text('Submit Report'),
              ),
            ],
          );
        },
      ),
    );
  }

  // Handle Post Comments Bottom Sheet
  void _showCommentsSheet(CommunityPostModel post) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => PostCommentsSheet(post: post, onCommentAdded: () => _fetchPosts()),
    );
  }

  // Handle Like Toggle
  Future<void> _toggleLike(CommunityPostModel post) async {
    final result = await ApiService().togglePostLike(post.postId);
    if (result != null) {
      final bool newIsLiked = result['isLiked'] as bool? ?? false;
      final int newLikesCount = result['likesCount'] as int? ?? post.likesCount;

      setState(() {
        final index = _allPosts.indexWhere((p) => p.postId == post.postId);
        if (index != -1) {
          _allPosts[index] = _allPosts[index].copyWith(
            isLikedByMe: newIsLiked,
            likesCount: newLikesCount,
          );
        }
        final myIndex = _myPosts.indexWhere((p) => p.postId == post.postId);
        if (myIndex != -1) {
          _myPosts[myIndex] = _myPosts[myIndex].copyWith(
            isLikedByMe: newIsLiked,
            likesCount: newLikesCount,
          );
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentUser = AuthService().currentUser;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Community Hub',
          style: GoogleFonts.dmSans(fontWeight: FontWeight.w800, fontSize: 22),
        ),
        actions: [
          IconButton(
            icon: Icon(
              _sortBy == 'latest' ? Icons.access_time_rounded : Icons.local_fire_department_rounded,
              color: AppColors.onSurface,
            ),
            tooltip: _sortBy == 'latest' ? 'Showing Latest' : 'Showing Popular',
            onPressed: _toggleSort,
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _fetchPosts,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.brandYellow,
          labelColor: AppColors.onSurface,
          labelStyle: GoogleFonts.dmSans(fontWeight: FontWeight.w700),
          tabs: const [
            Tab(text: 'All Feed'),
            Tab(text: 'My Posts'),
          ],
        ),
      ),
      floatingActionButton: Padding(
        padding: EdgeInsets.only(bottom: widget.isWorkerMode ? 74.0 : 0.0),
        child: FloatingActionButton.extended(
          backgroundColor: widget.isWorkerMode ? const Color(0xFF2563EB) : AppColors.brandYellow,
          foregroundColor: widget.isWorkerMode ? Colors.white : Colors.black,
          elevation: 4,
        onPressed: () {
          if (AuthService().currentUser == null) {
            Navigator.pushNamed(context, '/join');
          } else {
            _showPostDialog();
          }
        },
        icon: const Icon(Icons.add_rounded, size: 24),
        label: Text(
          'New Post',
          style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 15),
        ),
      ),
    ),
    body: TabBarView(
        controller: _tabController,
        children: [
          _buildFeedView(_allPosts, currentUser),
          _buildFeedView(_myPosts, currentUser, isMyPosts: true),
        ],
      ),
    );
  }

  Widget _buildFeedView(List<CommunityPostModel> posts, AuthUser? currentUser, {bool isMyPosts = false}) {
    return RefreshIndicator(
      onRefresh: _fetchPosts,
      child: ListView(
        padding: EdgeInsets.fromLTRB(16, 16, 16, widget.isWorkerMode ? 96 : 16),
        children: [
          // Banner
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.primaryContainer,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.brandYellow),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.groups_rounded,
                  color: AppColors.onPrimaryContainer,
                  size: 28,
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Neighborhood Help & Discussions',
                        style: GoogleFonts.dmSans(
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                          color: AppColors.onPrimaryContainer,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Ask questions, request recommendations, or offer tips to nearby residents.',
                        style: GoogleFonts.dmSans(
                          fontSize: 13,
                          color: AppColors.onPrimaryContainer,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Search Bar
          TextField(
            controller: _searchController,
            onChanged: _onSearchChanged,
            decoration: InputDecoration(
              hintText: 'Search community posts...',
              prefixIcon: const Icon(Icons.search_rounded),
              suffixIcon: _searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear_rounded),
                      onPressed: () {
                        _searchController.clear();
                        _onSearchChanged('');
                      },
                    )
                  : null,
              filled: true,
              fillColor: AppColors.surfaceVariant.withValues(alpha: 0.5),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide.none,
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
          ),
          const SizedBox(height: 14),

          // Categories Filter Row
          SizedBox(
            height: 40,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                _buildCategoryChip('All', 'All Categories'),
                ..._categories.map((c) => _buildCategoryChip(c.id, c.name)),
              ],
            ),
          ),
          const SizedBox(height: 16),

          if (_isLoading)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(40.0),
                child: LoadingIndicatorM3E(),
              ),
            )
          else if (posts.isEmpty)
            Container(
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                color: AppColors.surfaceVariant.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Center(
                child: Column(
                  children: [
                    const Icon(Icons.forum_outlined, size: 48, color: AppColors.onSurfaceVariant),
                    const SizedBox(height: 12),
                    Text(
                      isMyPosts ? 'You have not created any posts yet' : 'No community posts found',
                      style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 16),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      isMyPosts
                          ? 'Tap "+ New Post" below to start your first community discussion!'
                          : 'Be the first to post recommendations or ask for help in your area!',
                      style: GoogleFonts.dmSans(fontSize: 13, color: AppColors.onSurfaceVariant),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            )
          else
            ...posts.map((post) => Padding(
                  padding: const EdgeInsets.only(bottom: 14.0),
                  child: _buildPostCard(post, currentUser),
                )),
        ],
      ),
    );
  }

  Widget _buildCategoryChip(String id, String label) {
    final isSelected = _selectedCategory.toLowerCase() == id.toLowerCase();
    return Padding(
      padding: const EdgeInsets.only(right: 8.0),
      child: FilterChip(
        selected: isSelected,
        label: Text(label),
        labelStyle: GoogleFonts.dmSans(
          fontSize: 12,
          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
          color: isSelected ? Colors.black : AppColors.onSurface,
        ),
        selectedColor: AppColors.brandYellow,
        backgroundColor: AppColors.surfaceVariant,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        onSelected: (_) => _onCategorySelected(id),
      ),
    );
  }

  Widget _buildPostCard(CommunityPostModel post, AuthUser? currentUser) {
    final bool canManage = post.isAuthor(currentUser?.email, currentUser?.name);

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Author Header
          Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: AppColors.primaryContainer,
                child: post.userAvatar.isNotEmpty && post.userAvatar.startsWith('http')
                    ? ClipOval(
                        child: Image.network(
                          post.userAvatar,
                          width: 36,
                          height: 36,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => Text(
                            post.userName.isNotEmpty ? post.userName[0].toUpperCase() : 'U',
                            style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, color: AppColors.onPrimaryContainer),
                          ),
                        ),
                      )
                    : Text(
                        post.userName.isNotEmpty ? post.userName[0].toUpperCase() : 'U',
                        style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, color: AppColors.onPrimaryContainer),
                      ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      post.userName,
                      style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 14),
                    ),
                    Text(
                      '${post.location} • ${_formatTimeAgo(post.createdAt)}',
                      style: GoogleFonts.dmSans(fontSize: 11, color: AppColors.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.surfaceVariant,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  post.serviceCategoryName,
                  style: GoogleFonts.dmSans(fontWeight: FontWeight.w600, fontSize: 11, color: AppColors.onSurface),
                ),
              ),
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert_rounded, size: 20, color: AppColors.onSurfaceVariant),
                onSelected: (val) {
                  if (val == 'edit') {
                    _showPostDialog(postToEdit: post);
                  } else if (val == 'delete') {
                    _confirmDeletePost(post);
                  } else if (val == 'report') {
                    _showReportDialog(post);
                  }
                },
                itemBuilder: (ctx) => [
                  if (canManage) ...[
                    const PopupMenuItem(
                      value: 'edit',
                      child: Row(
                        children: [
                          Icon(Icons.edit_outlined, size: 18),
                          SizedBox(width: 8),
                          Text('Edit Post'),
                        ],
                      ),
                    ),
                    const PopupMenuItem(
                      value: 'delete',
                      child: Row(
                        children: [
                          Icon(Icons.delete_outline_rounded, size: 18, color: AppColors.error),
                          SizedBox(width: 8),
                          Text('Delete Post', style: TextStyle(color: AppColors.error)),
                        ],
                      ),
                    ),
                  ] else ...[
                    const PopupMenuItem(
                      value: 'report',
                      child: Row(
                        children: [
                          Icon(Icons.flag_outlined, size: 18),
                          SizedBox(width: 8),
                          Text('Report Post'),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Post Title
          Text(
            post.title,
            style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 16),
          ),
          const SizedBox(height: 6),

          // Post Content
          Text(
            post.content,
            style: GoogleFonts.dmSans(fontSize: 14, color: AppColors.onSurfaceVariant, height: 1.4),
          ),

          // Images if present
          if (post.images.isNotEmpty) ...[
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: post.images.first.startsWith('data:image/')
                  ? Image.memory(
                      base64Decode(post.images.first.split(',').last),
                      height: 200,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => const SizedBox.shrink(),
                    )
                  : Image.network(
                      post.images.first,
                      height: 200,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => const SizedBox.shrink(),
                    ),
            ),
          ],

          const SizedBox(height: 16),

          // Action Row (Like, Comment, Share)
          Row(
            children: [
              InkWell(
                borderRadius: BorderRadius.circular(20),
                onTap: () => _toggleLike(post),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: post.isLikedByMe ? AppColors.brandYellow.withValues(alpha: 0.3) : AppColors.surfaceVariant,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        post.isLikedByMe ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                        size: 18,
                        color: post.isLikedByMe ? Colors.red : AppColors.onSurface,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        '${post.likesCount}',
                        style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 14),
              InkWell(
                borderRadius: BorderRadius.circular(20),
                onTap: () => _showCommentsSheet(post),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceVariant,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.mode_comment_outlined, size: 18, color: AppColors.onSurfaceVariant),
                      const SizedBox(width: 6),
                      Text(
                        '${post.commentsCount} Comments',
                        style: GoogleFonts.dmSans(fontSize: 13, color: AppColors.onSurfaceVariant, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              ),
              const Spacer(),
              IconButton(
                icon: const Icon(Icons.share_outlined, size: 20),
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Post link copied to clipboard!')),
                  );
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _formatTimeAgo(DateTime date) {
    final diff = DateTime.now().difference(date);
    if (diff.inDays > 0) return '${diff.inDays}d ago';
    if (diff.inHours > 0) return '${diff.inHours}h ago';
    if (diff.inMinutes > 0) return '${diff.inMinutes}m ago';
    return 'Just now';
  }
}

// Sub-sheet component for Comments
class PostCommentsSheet extends StatefulWidget {
  final CommunityPostModel post;
  final VoidCallback onCommentAdded;

  const PostCommentsSheet({
    super.key,
    required this.post,
    required this.onCommentAdded,
  });

  @override
  State<PostCommentsSheet> createState() => _PostCommentsSheetState();
}

class _PostCommentsSheetState extends State<PostCommentsSheet> {
  List<CommunityCommentModel> _comments = [];
  bool _isLoading = true;
  bool _isSending = false;
  final TextEditingController _commentController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchComments();
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _fetchComments() async {
    setState(() => _isLoading = true);
    final comments = await ApiService().fetchPostComments(widget.post.postId);
    if (mounted) {
      setState(() {
        _comments = comments;
        _isLoading = false;
      });
    }
  }

  Future<void> _sendComment() async {
    final text = _commentController.text.trim();
    if (text.isEmpty) return;

    if (AuthService().currentUser == null) {
      Navigator.pushNamed(context, '/join');
      return;
    }

    setState(() => _isSending = true);
    final result = await ApiService().addPostComment(postId: widget.post.postId, content: text);
    if (mounted) {
      setState(() => _isSending = false);
      if (result != null) {
        _commentController.clear();
        _fetchComments();
        widget.onCommentAdded();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to post comment. Please try again.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        height: MediaQuery.of(context).size.height * 0.7,
        decoration: const BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            const SizedBox(height: 12),
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.outlineVariant,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'Comments',
                      style: GoogleFonts.dmSans(fontWeight: FontWeight.w800, fontSize: 18),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: _isLoading
                  ? const Center(child: LoadingIndicatorM3E())
                  : _comments.isEmpty
                      ? Center(
                          child: Text(
                            'No comments yet. Be the first to comment!',
                            style: GoogleFonts.dmSans(color: AppColors.onSurfaceVariant),
                          ),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(20),
                          itemCount: _comments.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 14),
                          itemBuilder: (context, index) {
                            final c = _comments[index];
                            return Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                CircleAvatar(
                                  radius: 16,
                                  backgroundColor: AppColors.surfaceVariant,
                                  child: Text(
                                    c.userName.isNotEmpty ? c.userName[0].toUpperCase() : 'U',
                                    style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 12),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: AppColors.surfaceVariant.withValues(alpha: 0.5),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(
                                              c.userName,
                                              style: GoogleFonts.dmSans(fontWeight: FontWeight.w700, fontSize: 13),
                                            ),
                                            Text(
                                              _formatTimeAgo(c.createdAt),
                                              style: GoogleFonts.dmSans(fontSize: 10, color: AppColors.onSurfaceVariant),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          c.content,
                                          style: GoogleFonts.dmSans(fontSize: 13),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            );
                          },
                        ),
            ),
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(12.0),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _commentController,
                      decoration: InputDecoration(
                        hintText: 'Add a comment...',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide.none,
                        ),
                        filled: true,
                        fillColor: AppColors.surfaceVariant,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    style: IconButton.styleFrom(backgroundColor: AppColors.brandYellow, foregroundColor: Colors.black),
                    onPressed: _isSending ? null : _sendComment,
                    icon: _isSending
                        ? const SizedBox(width: 18, height: 18, child: LoadingIndicatorM3E())
                        : const Icon(Icons.send_rounded, size: 20),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatTimeAgo(DateTime date) {
    final diff = DateTime.now().difference(date);
    if (diff.inDays > 0) return '${diff.inDays}d ago';
    if (diff.inHours > 0) return '${diff.inHours}h ago';
    if (diff.inMinutes > 0) return '${diff.inMinutes}m ago';
    return 'Just now';
  }
}
