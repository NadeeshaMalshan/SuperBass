class ServiceCategoryDef {
  final String id;
  final String name;
  final String icon;
  final List<String> defaultSkills;

  const ServiceCategoryDef({
    required this.id,
    required this.name,
    required this.icon,
    required this.defaultSkills,
  });
}

class WorkerServicesCatalog {
  static const List<ServiceCategoryDef> categories = [
    ServiceCategoryDef(
      id: 'plumbing',
      name: 'Plumbing',
      icon: '🔧',
      defaultSkills: [
        'Pipe Fitting & Installation',
        'Leak Detection & Repair',
        'Drain Unclogging',
        'Bathroom & Toilet Fixtures',
        'Water Heater Installation',
        'Water Pump Repair',
        'Tap & Valve Replacement',
      ],
    ),
    ServiceCategoryDef(
      id: 'electrical',
      name: 'Electrical',
      icon: '⚡',
      defaultSkills: [
        'House Wiring & Rewiring',
        'Circuit Breaker / DB Setup',
        'Lighting & Ceiling Fan Installation',
        'Socket & Switch Repair',
        'Appliance Power Wiring',
        'Solar Inverter Setup',
        'Electrical Fault Finding',
      ],
    ),
    ServiceCategoryDef(
      id: 'carpentry',
      name: 'Carpentry',
      icon: '🪚',
      defaultSkills: [
        'Furniture Assembly & Repair',
        'Door & Window Fitting',
        'Custom Cabinets & Shelving',
        'Roof Truss & Wood Framing',
        'Lock Fitting & Replacement',
        'Wood Polishing & Sanding',
      ],
    ),
    ServiceCategoryDef(
      id: 'masonry',
      name: 'Masonry',
      icon: '🧱',
      defaultSkills: [
        'Brick & Block Work',
        'Plastering & Skimming',
        'Tile & Marble Laying',
        'Concrete Slab & Footings',
        'Waterproofing',
        'Demolition & Structural Repair',
      ],
    ),
    ServiceCategoryDef(
      id: 'painting',
      name: 'Painting',
      icon: '🎨',
      defaultSkills: [
        'Interior Wall Painting',
        'Exterior Weatherproof Painting',
        'Wood & Metal Painting',
        'Wall Putty & Primer Finishing',
        'Waterproofing Treatment',
        'Wallpaper Installation',
      ],
    ),
    ServiceCategoryDef(
      id: 'ac-repair',
      name: 'AC Repair',
      icon: '❄️',
      defaultSkills: [
        'AC Servicing & Cleaning',
        'Gas Top-up & Leak Fix',
        'Compressor Repair',
        'New AC Installation & Mounting',
        'Thermostat & PCB Repair',
      ],
    ),
    ServiceCategoryDef(
      id: 'roofing',
      name: 'Roofing',
      icon: '🏠',
      defaultSkills: [
        'Roof Tile Replacement',
        'Asbestos / Sheet Fitting',
        'Gutter Installation & Cleaning',
        'Roof Leak Sealing',
        'Waterproofing Membrane',
      ],
    ),
    ServiceCategoryDef(
      id: 'appliance-repair',
      name: 'Appliance Repair',
      icon: '🔌',
      defaultSkills: [
        'Washing Machine Repair',
        'Refrigerator Repair',
        'Microwave & Oven Repair',
        'TV Mounting & Setup',
        'Water Dispenser Repair',
      ],
    ),
    ServiceCategoryDef(
      id: 'cctv-security',
      name: 'CCTV & Security',
      icon: '📹',
      defaultSkills: [
        'CCTV Camera Installation',
        'DVR / NVR Configuration',
        'Network & Internet Cabling',
        'Intercom & Video Doorbell',
        'Alarm Sensor Setup',
      ],
    ),
    ServiceCategoryDef(
      id: 'cleaning',
      name: 'Cleaning',
      icon: '🧹',
      defaultSkills: [
        'Deep Home Cleaning',
        'Sofa & Carpet Shampooing',
        'Pressure Washing',
        'Water Tank Cleaning',
        'Post-Construction Cleanup',
      ],
    ),
    ServiceCategoryDef(
      id: 'gardening',
      name: 'Gardening & Landscaping',
      icon: '🌱',
      defaultSkills: [
        'Lawn Mowing & Edging',
        'Tree Pruning & Cutting',
        'Garden Landscaping',
        'Hedge Trimming',
        'Pest & Weed Control',
      ],
    ),
  ];

  static List<String> getSkillsForService(String serviceName) {
    final cat = categories.firstWhere(
      (c) => c.name.toLowerCase() == serviceName.toLowerCase() || c.id.toLowerCase() == serviceName.toLowerCase(),
      orElse: () => const ServiceCategoryDef(id: '', name: '', icon: '', defaultSkills: []),
    );
    return cat.defaultSkills;
  }
}
