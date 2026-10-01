import 'package:flutter/material.dart';

class VerifiedBadge extends StatelessWidget {
  const VerifiedBadge({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.only(left: 4.0),
      child: Icon(
        Icons.verified,
        color: Colors.blue,
        size: 20.0,
      ),
    );
  }
}
