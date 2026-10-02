import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:google_fonts/google_fonts.dart';

/// Reusable OpenStreetMap Map for SuperBass (Web & Mobile compatible)
/// Supports both Interactive Pinning and Static/Preview Modes.
class SuperBassMap extends StatefulWidget {
  final double latitude;
  final double longitude;
  final double zoom;
  final double height;
  final double borderRadius;
  final bool isInteractive;
  final String markerTitle;
  final ValueChanged<LatLng>? onLocationPicked;

  const SuperBassMap({
    super.key,
    required this.latitude,
    required this.longitude,
    this.zoom = 14.5,
    this.height = 200,
    this.borderRadius = 16,
    this.isInteractive = false,
    this.markerTitle = 'Service Location',
    this.onLocationPicked,
  });

  @override
  State<SuperBassMap> createState() => _SuperBassMapState();
}

class _SuperBassMapState extends State<SuperBassMap> {
  late MapController _mapController;
  late LatLng _currentPoint;

  @override
  void initState() {
    super.initState();
    _mapController = MapController();
    _currentPoint = LatLng(
      widget.latitude != 0.0 ? widget.latitude : 6.9271,
      widget.longitude != 0.0 ? widget.longitude : 79.8612,
    );
  }

  @override
  void didUpdateWidget(covariant SuperBassMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.latitude != widget.latitude ||
        oldWidget.longitude != widget.longitude) {
      final newPoint = LatLng(
        widget.latitude != 0.0 ? widget.latitude : 6.9271,
        widget.longitude != 0.0 ? widget.longitude : 79.8612,
      );
      setState(() {
        _currentPoint = newPoint;
      });
      _mapController.move(newPoint, widget.zoom);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: widget.height,
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(widget.borderRadius),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        color: const Color(0xFFF1F5F9),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: _currentPoint,
              initialZoom: widget.zoom,
              interactionOptions: InteractionOptions(
                flags: widget.isInteractive
                    ? InteractiveFlag.all
                    : InteractiveFlag.none,
              ),
              onTap: widget.isInteractive
                  ? (tapPosition, point) {
                      setState(() {
                        _currentPoint = point;
                      });
                      widget.onLocationPicked?.call(point);
                    }
                  : null,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.superbass.app',
                fallbackUrl: 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
                maxZoom: 19,
              ),
              MarkerLayer(
                markers: [
                  Marker(
                    point: _currentPoint,
                    width: 140,
                    height: 56,
                    alignment: Alignment.topCenter,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (widget.markerTitle.isNotEmpty)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3,
                            ),
                            margin: const EdgeInsets.only(bottom: 2),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(6),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.15),
                                  blurRadius: 4,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Text(
                              widget.markerTitle,
                              style: GoogleFonts.dmSans(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: Colors.black,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        Container(
                          padding: const EdgeInsets.all(5),
                          decoration: const BoxDecoration(
                            color: Colors.black,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black38,
                                blurRadius: 6,
                                offset: Offset(0, 3),
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.location_on,
                            color: Colors.white,
                            size: 16,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),

          // Zoom control buttons for interactive mode
          if (widget.isInteractive)
            Positioned(
              right: 10,
              bottom: 10,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _buildZoomBtn(Icons.add, () {
                    final newZoom = (_mapController.camera.zoom + 1).clamp(3.0, 19.0);
                    _mapController.move(_currentPoint, newZoom);
                  }),
                  const SizedBox(height: 6),
                  _buildZoomBtn(Icons.remove, () {
                    final newZoom = (_mapController.camera.zoom - 1).clamp(3.0, 19.0);
                    _mapController.move(_currentPoint, newZoom);
                  }),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildZoomBtn(IconData icon, VoidCallback onPressed) {
    return Material(
      color: Colors.white,
      shape: const CircleBorder(),
      elevation: 3,
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onPressed,
        child: Padding(
          padding: const EdgeInsets.all(6),
          child: Icon(icon, size: 18, color: Colors.black87),
        ),
      ),
    );
  }
}
