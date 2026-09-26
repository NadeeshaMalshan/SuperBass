import React from 'react';
import './ServiceCategories.css';

// Direct React/Vite asset imports from Frontend/src/assets/Icons
import plumbingImage from '../assets/Icons/plumbing.png';
import electricalImage from '../assets/Icons/electreical.png';
import carpentryImage from '../assets/Icons/Carpentry.png';
import paintingImage from '../assets/Icons/Painting.png';
import masonryImage from '../assets/Icons/Masonry & Construction.png';
import acImage from '../assets/Icons/AC & Air Conditioning.png';
import weldingImage from '../assets/Icons/Welding.png';
import cleaningImage from '../assets/Icons/Cleaning.png';
import gardeningImage from '../assets/Icons/Gardening & Landscaping.png';
import handymanImage from '../assets/Icons/Handyman Services.png';
import vehicleRepairImage from '../assets/Icons/Vehicle Repair & Mechanic.png';
import roofingImage from '../assets/Icons/Roofing.png';
import glassWindowImage from '../assets/Icons/Glass & Window Services.png';
import locksmithImage from '../assets/Icons/Locksmith.png';
import applianceRepairImage from '../assets/Icons/Appliance Repair.png';
import computerItImage from '../assets/Icons/Computer & IT Services.png';
import phoneRepairImage from '../assets/Icons/Phone Repair.png';
import movingTransportImage from '../assets/Icons/Moving & Transport.png';
import furnitureRepairImage from '../assets/Icons/Furniture Repair & Assembly.png';
import pestControlImage from '../assets/Icons/Pest Control.png';
import cctvImage from '../assets/Icons/CCTV Installation & Repair.png';

export {
  plumbingImage,
  electricalImage,
  carpentryImage,
  paintingImage,
  masonryImage,
  acImage,
  weldingImage,
  cleaningImage,
  gardeningImage,
  handymanImage,
  vehicleRepairImage,
  roofingImage,
  glassWindowImage,
  locksmithImage,
  applianceRepairImage,
  computerItImage,
  phoneRepairImage,
  movingTransportImage,
  furnitureRepairImage,
  pestControlImage,
  cctvImage
};

// Exactly 21 Service Categories in the exact layout order and descriptions of the UI
export const SERVICE_CATEGORIES = [
  {
    id: 'plumbing',
    name: 'Plumbing',
    desc: 'Fix pipes, leaks, taps and other plumbing problems.',
    illustration: plumbingImage
  },
  {
    id: 'electrical',
    name: 'Electrical',
    desc: 'Wiring, repairs, installations and maintenance.',
    illustration: electricalImage
  },
  {
    id: 'carpentry',
    name: 'Carpentry',
    desc: 'Furniture, doors, cupboards and other woodwork services.',
    illustration: carpentryImage
  },
  {
    id: 'painting',
    name: 'Painting',
    desc: 'Interior and exterior painting services.',
    illustration: paintingImage
  },
  {
    id: 'masonry-construction',
    name: 'Masonry & Construction',
    desc: 'Construction, walls, tiles and renovation work.',
    illustration: masonryImage
  },
  {
    id: 'ac-air-conditioning',
    name: 'AC & Air Conditioning',
    desc: 'Installation, repair, cleaning and maintenance.',
    illustration: acImage
  },
  {
    id: 'welding',
    name: 'Welding',
    desc: 'Metal welding and fabrication services.',
    illustration: weldingImage
  },
  {
    id: 'cleaning',
    name: 'Cleaning',
    desc: 'Home, office and deep-cleaning services.',
    illustration: cleaningImage
  },
  {
    id: 'gardening-landscaping',
    name: 'Gardening & Landscaping',
    desc: 'Garden maintenance, landscaping and lawn care.',
    illustration: gardeningImage
  },
  {
    id: 'handyman-services',
    name: 'Handyman Services',
    desc: 'General home repairs, installations and maintenance.',
    illustration: handymanImage
  },
  {
    id: 'vehicle-repair-mechanic',
    name: 'Vehicle Repair & Mechanic',
    desc: 'Vehicle servicing, repairs and mechanical maintenance.',
    illustration: vehicleRepairImage
  },
  {
    id: 'roofing',
    name: 'Roofing',
    desc: 'Roof installation, repairs, leaks and maintenance.',
    illustration: roofingImage
  },
  {
    id: 'glass-window-services',
    name: 'Glass & Window Services',
    desc: 'Glass installation, window repairs and replacements.',
    illustration: glassWindowImage
  },
  {
    id: 'locksmith',
    name: 'Locksmith',
    desc: 'Lock installation, repair, replacement and emergency services.',
    illustration: locksmithImage
  },
  {
    id: 'appliance-repair',
    name: 'Appliance Repair',
    desc: 'Repair and maintenance for household electrical appliances.',
    illustration: applianceRepairImage
  },
  {
    id: 'computer-it-services',
    name: 'Computer & IT Services',
    desc: 'Computer repair, software installation and technical support.',
    illustration: computerItImage
  },
  {
    id: 'phone-repair',
    name: 'Phone Repair',
    desc: 'Mobile phone repair, screen replacement and maintenance.',
    illustration: phoneRepairImage
  },
  {
    id: 'moving-transport',
    name: 'Moving & Transport',
    desc: 'Moving, delivery, transportation and loading services.',
    illustration: movingTransportImage
  },
  {
    id: 'furniture-repair-assembly',
    name: 'Furniture Repair & Assembly',
    desc: 'Furniture repair, installation and assembly services.',
    illustration: furnitureRepairImage
  },
  {
    id: 'pest-control',
    name: 'Pest Control',
    desc: 'Professional pest control and prevention services.',
    illustration: pestControlImage
  },
  {
    id: 'cctv-installation-repair',
    name: 'CCTV Installation & Repair',
    desc: 'CCTV camera installation, repair and maintenance.',
    illustration: cctvImage
  }
];

export const CATEGORY_ILLUSTRATIONS = {
  'Plumbing': plumbingImage,
  'plumbing': plumbingImage,
  'Electrical': electricalImage,
  'electrical': electricalImage,
  'Carpentry': carpentryImage,
  'carpentry': carpentryImage,
  'Painting': paintingImage,
  'painting': paintingImage,
  'Masonry & Construction': masonryImage,
  'masonry-construction': masonryImage,
  'Masonry': masonryImage,
  'masonry': masonryImage,
  'AC & Air Conditioning': acImage,
  'ac-air-conditioning': acImage,
  'AC Repair': acImage,
  'ac-repair': acImage,
  'Welding': weldingImage,
  'welding': weldingImage,
  'Cleaning': cleaningImage,
  'cleaning': cleaningImage,
  'Gardening & Landscaping': gardeningImage,
  'gardening-landscaping': gardeningImage,
  'Gardening': gardeningImage,
  'gardening': gardeningImage,
  'Handyman Services': handymanImage,
  'handyman-services': handymanImage,
  'Vehicle Repair & Mechanic': vehicleRepairImage,
  'vehicle-repair-mechanic': vehicleRepairImage,
  'Roofing': roofingImage,
  'roofing': roofingImage,
  'Glass & Window Services': glassWindowImage,
  'glass-window-services': glassWindowImage,
  'Locksmith': locksmithImage,
  'locksmith': locksmithImage,
  'Appliance Repair': applianceRepairImage,
  'appliance-repair': applianceRepairImage,
  'Computer & IT Services': computerItImage,
  'computer-it-services': computerItImage,
  'Phone Repair': phoneRepairImage,
  'phone-repair': phoneRepairImage,
  'Moving & Transport': movingTransportImage,
  'moving-transport': movingTransportImage,
  'Furniture Repair & Assembly': furnitureRepairImage,
  'furniture-repair-assembly': furnitureRepairImage,
  'Pest Control': pestControlImage,
  'pest-control': pestControlImage,
  'CCTV Installation & Repair': cctvImage,
  'cctv-installation-repair': cctvImage,
  'CCTV & Security': cctvImage,
  'cctv-security': cctvImage,
};

export function getCategoryIllustration(categoryKey) {
  if (!categoryKey) return null;
  const key = String(categoryKey).trim();
  if (CATEGORY_ILLUSTRATIONS[key]) return CATEGORY_ILLUSTRATIONS[key];

  const lower = key.toLowerCase();
  const matched = Object.entries(CATEGORY_ILLUSTRATIONS).find(
    ([k]) => k.toLowerCase() === lower
  );
  return matched ? matched[1] : null;
}

/**
 * ServiceCategories section replicating the exact UI design:
 * - Header: EXPLORE OUR SERVICES, Find the right professional for your needs, View all services ->
 * - 3-column card grid with category title, description, "Details >" pill button, and illustration on right.
 */
export default function ServiceCategories({
  onSelectCategory,
  showHeader = true,
  className = ''
}) {
  const navigateToCategory = (catName) => {
    if (onSelectCategory) {
      onSelectCategory(catName);
    } else {
      const searchUrl = `/find?q=${encodeURIComponent(catName)}`;
      window.history.pushState({}, '', searchUrl);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const navigateToAllServices = () => {
    window.history.pushState({}, '', '/find');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <section className={`services-directory-section ${className}`}>
      <div className="services-directory-container">
        {showHeader && (
          <div className="services-directory-header">
            <div className="services-directory-title-col">
              <span className="services-directory-overline">EXPLORE OUR SERVICES</span>
              <h2 className="services-directory-heading">
                Find the right professional for your needs
              </h2>
              <p className="services-directory-subheading">
                Choose from a wide range of trusted service providers in your area.
              </p>
            </div>
            <div className="services-directory-action-col">
              <button
                type="button"
                className="services-directory-view-all"
                onClick={navigateToAllServices}
              >
                <span>View all services</span>
                <span className="services-directory-arrow">→</span>
              </button>
            </div>
          </div>
        )}

        <div className="services-cards-grid">
          {SERVICE_CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              className="service-card-item"
              onClick={() => navigateToCategory(cat.name)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigateToCategory(cat.name)}
            >
              <div className="service-card-text">
                <h3 className="service-card-name">{cat.name}</h3>
                <p className="service-card-desc">{cat.desc}</p>
                <div className="service-card-btn-wrap">
                  <span className="service-card-details-btn">
                    <span>Details</span>
                    <span className="service-card-details-chevron">›</span>
                  </span>
                </div>
              </div>

              <div className="service-card-image-wrap">
                <img
                  src={cat.illustration}
                  alt={cat.name}
                  className="service-card-illustration"
                  loading="lazy"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
