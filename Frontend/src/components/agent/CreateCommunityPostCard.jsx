import React, { useState, useRef, useEffect } from 'react';
import craftsmanAvatar from '../../assets/carftman.png';
import {
  acImage,
  plumbingImage,
  electricalImage,
  carpentryImage,
  paintingImage,
  cleaningImage,
  applianceRepairImage,
  roofingImage,
  gardeningImage,
  handymanImage,
} from '../../assets/Icons';
import './AgentCards.css';

const CATEGORY_OPTIONS = [
  { id: 'AC Repair & Air Conditioning', label: 'AC Repair & Air Conditioning', icon: acImage },
  { id: 'Plumbing', label: 'Plumbing & Pipe Repair', icon: plumbingImage },
  { id: 'Electrical', label: 'Electrical & Wiring', icon: electricalImage },
  { id: 'Carpentry', label: 'Carpentry & Woodwork', icon: carpentryImage },
  { id: 'Painting', label: 'Painting & Deco', icon: paintingImage },
  { id: 'Cleaning', label: 'Home & Office Cleaning', icon: cleaningImage },
  { id: 'Appliance Repair', label: 'Appliance Repair', icon: applianceRepairImage },
  { id: 'Roofing', label: 'Roofing Services', icon: roofingImage },
  { id: 'Gardening & Landscaping', label: 'Gardening & Landscaping', icon: gardeningImage },
  { id: 'Handyman Services', label: 'Handyman Services', icon: handymanImage },
];

export default function CreateCommunityPostCard({ data = {}, onAction }) {
  const cardRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(1); // 1: Details, 2: Review, 3: Publish
  const [selectedCategory, setSelectedCategory] = useState(
    data.communityId || data.category || 'AC Repair & Air Conditioning'
  );
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [title, setTitle] = useState(data.title || 'Service Request');
  const [description, setDescription] = useState(
    data.content ||
      data.description ||
      'I am looking for professional services in Colombo. Please reach out if you can assist.'
  );
  const [location, setLocation] = useState(data.location || 'Colombo');

  // Initial photos start empty so user can attach real photos
  const [photos, setPhotos] = useState(
    Array.isArray(data.photos) ? data.photos : (Array.isArray(data.images) ? data.images.map((img, i) => ({ id: `init-${i}`, url: img })) : [])
  );

  const fileInputRef = useRef(null);

  useEffect(() => {
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [currentStep]);

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64Url = uploadEvent.target.result;
        setPhotos((prev) => {
          if (prev.length >= 5) return prev;
          return [
            ...prev,
            {
              id: `upload-${Date.now()}-${idx}`,
              url: base64Url,
              name: file.name,
              file,
            },
          ];
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (idToRemove) => {
    setPhotos((prev) => prev.filter((p) => p.id !== idToRemove));
  };

  const currentCategoryObj =
    CATEGORY_OPTIONS.find((c) => c.id.toLowerCase() === selectedCategory.toLowerCase()) ||
    CATEGORY_OPTIONS[0];

  const handleContinue = () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
      // Trigger confirmation action to Agent backend with current edited values and real attached images
      const promptToExecute = `CONFIRM_PUBLISH: Yes, please publish the community post '${title}' in ${selectedCategory} for ${location}. Description: ${description}`;
      const payloadObj = {
        prompt: promptToExecute,
        postData: {
          title,
          content: description,
          communityId: selectedCategory,
          location,
          images: photos.map((p) => p.url),
        },
      };
      onAction && onAction('confirm_post', payloadObj);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div ref={cardRef} className="create-post-card-root">
      {/* 1. Header with Craftsman Avatar and Title */}
      <div className="create-post-header">
        <div className="create-post-avatar-wrapper">
          <img src={craftsmanAvatar} alt="Workio Assistant" className="create-post-avatar-img" />
        </div>
        <div className="create-post-header-text">
          <h2 className="create-post-title">Create Community Post</h2>
          <p className="create-post-subtitle">Share your service needs with the Workio community</p>
        </div>
      </div>

      {/* 2. Progress Stepper Bar */}
      <div className="create-post-stepper">
        {/* Step 1 */}
        <div
          className={`create-post-step-item ${currentStep === 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}
          onClick={() => currentStep > 1 && setCurrentStep(1)}
        >
          <div className="step-circle">
            {currentStep > 1 ? <i className="fa-solid fa-check"></i> : '1'}
          </div>
          <span className="step-label">Details</span>
        </div>

        <div className={`step-line ${currentStep > 1 ? 'completed' : ''}`}></div>

        {/* Step 2 */}
        <div
          className={`create-post-step-item ${currentStep === 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}
          onClick={() => currentStep > 2 && setCurrentStep(2)}
        >
          <div className="step-circle">
            {currentStep > 2 ? <i className="fa-solid fa-check"></i> : '2'}
          </div>
          <span className="step-label">Review</span>
        </div>

        <div className={`step-line ${currentStep > 2 ? 'completed' : ''}`}></div>

        {/* Step 3 */}
        <div className={`create-post-step-item ${currentStep === 3 ? 'active' : ''}`}>
          <div className="step-circle">3</div>
          <span className="step-label">Publish</span>
        </div>
      </div>

      {/* STEP 1: Details Form */}
      {currentStep === 1 && (
        <div className="create-post-form-body">
          {/* Service Category */}
          <div className="create-post-field-group">
            <label className="create-post-label">Service Category</label>
            <div className="category-select-wrapper">
              <div
                className="category-select-btn"
                onClick={() => setCategoryDropdownOpen((prev) => !prev)}
              >
                <div className="category-select-left">
                  <div className="category-icon-squircle">
                    <img src={currentCategoryObj.icon} alt={currentCategoryObj.label} />
                  </div>
                  <span className="category-select-name">{currentCategoryObj.label}</span>
                </div>
                <i
                  className={`fa-solid fa-chevron-down category-chevron ${categoryDropdownOpen ? 'rotated' : ''}`}
                ></i>
              </div>

              {categoryDropdownOpen && (
                <div className="category-dropdown-menu">
                  {CATEGORY_OPTIONS.map((cat) => (
                    <div
                      key={cat.id}
                      className={`category-dropdown-option ${cat.id === selectedCategory ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setCategoryDropdownOpen(false);
                      }}
                    >
                      <div className="category-option-icon">
                        <img src={cat.icon} alt={cat.label} />
                      </div>
                      <span>{cat.label}</span>
                      {cat.id === selectedCategory && (
                        <i className="fa-solid fa-check option-check"></i>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="create-post-field-group">
            <label className="create-post-label">Title</label>
            <input
              type="text"
              className="create-post-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AC Repair Services Needed"
            />
          </div>

          {/* Description */}
          <div className="create-post-field-group">
            <label className="create-post-label">Description</label>
            <textarea
              className="create-post-textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your issue or service need..."
            />
          </div>

          {/* Location */}
          <div className="create-post-field-group">
            <label className="create-post-label">Location</label>
            <div className="create-post-icon-input">
              <i className="fa-solid fa-location-dot input-left-icon"></i>
              <input
                type="text"
                className="icon-input-field"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Colombo"
              />
            </div>
          </div>

          {/* Photos Upload Section */}
          <div className="create-post-photos-section">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              style={{ display: 'none' }}
            />

            {/* Upload Box */}
            <div
              className="photo-upload-dropzone"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="photo-upload-icon-wrap">
                <i className="fa-regular fa-image"></i>
              </div>
              <span className="photo-upload-main-text">Add Photos (Optional)</span>
              <span className="photo-upload-sub-text">Upload photos of the issue (max 5)</span>
            </div>

            {/* Photo Thumbnails */}
            {photos.map((item) => (
              <div key={item.id} className="photo-thumbnail-card">
                <img src={item.url} alt="Issue preview" className="photo-thumbnail-img" />
                <button
                  type="button"
                  className="photo-remove-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePhoto(item.id);
                  }}
                  title="Remove photo"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            ))}

            {/* Plus Button */}
            {photos.length < 5 && (
              <button
                type="button"
                className="photo-add-plus-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Add photo"
              >
                <i className="fa-solid fa-plus"></i>
              </button>
            )}
          </div>

          {/* Bottom Action Button */}
          <div className="create-post-actions-row">
            <button type="button" className="create-post-continue-btn" onClick={handleContinue}>
              <span>Continue</span>
              <i className="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Review Screen */}
      {currentStep === 2 && (
        <div className="create-post-review-body">
          <div className="review-summary-card">
            <div className="review-category-badge">
              <img src={currentCategoryObj.icon} alt={currentCategoryObj.label} />
              <span>{selectedCategory}</span>
            </div>

            <h3 className="review-title">{title}</h3>
            <p className="review-description">{description}</p>

            <div className="review-meta-row">
              <span className="review-location">
                <i className="fa-solid fa-location-dot"></i> {location}
              </span>
              <span className="review-photo-count">
                <i className="fa-regular fa-image"></i> {photos.length} photo(s) attached
              </span>
            </div>

            {photos.length > 0 && (
              <div className="review-photos-grid">
                {photos.map((p) => (
                  <img key={p.id} src={p.url} alt="Attached" className="review-preview-img" />
                ))}
              </div>
            )}
          </div>

          <div className="create-post-actions-row review-actions">
            <button type="button" className="create-post-back-btn" onClick={handleBack}>
              <i className="fa-solid fa-arrow-left"></i>
              <span>Back to Edit</span>
            </button>
            <button type="button" className="create-post-continue-btn" onClick={handleContinue}>
              <span>Publish Post</span>
              <i className="fa-solid fa-paper-plane"></i>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Published Screen */}
      {currentStep === 3 && (
        <div className="create-post-published-body">
          <div className="published-success-icon">
            <i className="fa-solid fa-circle-check"></i>
          </div>
          <h3 className="published-title">Post Published to Community!</h3>
          <p className="published-subtitle">
            Your request for <strong>{selectedCategory}</strong> has been posted. Local craftsmen will receive your notification and can send quotes.
          </p>

          <div className="create-post-actions-row published-actions">
            <button
              type="button"
              className="create-post-continue-btn"
              onClick={() => onAction && onAction('view_community', {})}
            >
              <span>View in Community Feed</span>
              <i className="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
