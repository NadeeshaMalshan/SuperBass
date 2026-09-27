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
      id: 'masonry-construction',
      name: 'Masonry & Construction',
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
      id: 'ac-air-conditioning',
      name: 'AC & Air Conditioning',
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
      id: 'welding',
      name: 'Welding',
      icon: '🔥',
      defaultSkills: [
        'Iron Gate & Grille Fabrication',
        'Metal Frame Welding',
        'Railing Installation',
        'Spot & Arc Welding',
        'Structural Metal Repair',
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
      id: 'gardening-landscaping',
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
    ServiceCategoryDef(
      id: 'handyman-services',
      name: 'Handyman Services',
      icon: '🧰',
      defaultSkills: [
        'Curtain & Blind Hanging',
        'Wall Shelf Mounting',
        'Minor Repairs & Fixes',
        'TV Wall Mounting',
        'Doorknob & Hinge Fixes',
      ],
    ),
    ServiceCategoryDef(
      id: 'vehicle-repair-mechanic',
      name: 'Vehicle Repair & Mechanic',
      icon: '🚗',
      defaultSkills: [
        'Car & Van Mechanical Repair',
        'Motorbike & Scooter Service',
        'Battery Replacement & Jumpstart',
        'Brake & Suspension Inspection',
        'Engine Diagnostics',
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
      id: 'glass-window-services',
      name: 'Glass & Window Services',
      icon: '🪟',
      defaultSkills: [
        'Window Glass Replacement',
        'Aluminium Window Framing',
        'Shower Glass Partition Fitting',
        'Tint Film Installation',
        'Mirror Fitting',
      ],
    ),
    ServiceCategoryDef(
      id: 'locksmith',
      name: 'Locksmith',
      icon: '🔑',
      defaultSkills: [
        'Emergency Lockout Service',
        'Lock Replacement & Upgrade',
        'Key Duplication',
        'Digital & Smart Lock Installation',
        'Padlock & Gate Lock Fixing',
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
        'TV Mounting & Repair',
        'Water Dispenser Repair',
      ],
    ),
    ServiceCategoryDef(
      id: 'computer-it-services',
      name: 'Computer & IT Services',
      icon: '💻',
      defaultSkills: [
        'PC & Laptop Hardware Repair',
        'Operating System Setup & Formatting',
        'WiFi & Home Network Setup',
        'Virus & Malware Removal',
        'Printer & Peripheral Setup',
      ],
    ),
    ServiceCategoryDef(
      id: 'phone-repair',
      name: 'Phone Repair',
      icon: '📱',
      defaultSkills: [
        'Screen & Glass Replacement',
        'Battery Replacement',
        'Charging Port Repair',
        'Speaker & Mic Fix',
        'Software Flashing & Unlock',
      ],
    ),
    ServiceCategoryDef(
      id: 'moving-transport',
      name: 'Moving & Transport',
      icon: '🚚',
      defaultSkills: [
        'Household Goods Moving',
        'Lorry & Dimo Batta Rental',
        'Furniture Packing & Loading',
        'Office Relocation',
        'Item Delivery & Hauling',
      ],
    ),
    ServiceCategoryDef(
      id: 'furniture-repair-assembly',
      name: 'Furniture Repair & Assembly',
      icon: '🛋️',
      defaultSkills: [
        'Flat-pack Furniture Assembly',
        'Cushion & Sofa Reupholstery',
        'Bed Frame & Dining Table Repair',
        'Drawer & Track Replacement',
        'Antique Wood Restoration',
      ],
    ),
    ServiceCategoryDef(
      id: 'pest-control',
      name: 'Pest Control',
      icon: '🛡️',
      defaultSkills: [
        'Termite (Weli) Treatment',
        'Cockroach & Ant Extermination',
        'Bedbug Elimination',
        'Rodent & Rat Proofing',
        'Garden Pest Spraying',
      ],
    ),
    ServiceCategoryDef(
      id: 'others',
      name: 'Others',
      icon: '✨',
      defaultSkills: [
        'General Home Maintenance',
        'Custom Service Inquiry',
        'Seasonal Work',
      ],
    ),
  ];

  static List<String> getSkillsForService(String serviceName) {
    final cat = categories.firstWhere(
      (c) => c.name.toLowerCase() == serviceName.toLowerCase() || c.id.toLowerCase() == serviceName.toLowerCase(),
      orElse: () => const ServiceCategoryDef(id: 'others', name: 'Others', icon: '✨', defaultSkills: []),
    );
    return cat.defaultSkills;
  }
}
