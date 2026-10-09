"""
Pydantic Card Models for Structured Frontend Responses.
Each response corresponds to a dedicated UI Card in the Workio frontend.
"""

from typing import List, Optional, Union, Literal, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, timezone


class CommunityPostSummary(BaseModel):
    """Summary of a community post for list view."""
    id: Union[int, str] = Field(description="Unique post identifier")
    title: str = Field(description="Post title")
    content: str = Field(description="Post body snippet or content")
    communityId: str = Field(default="General", description="Category or community identifier")
    location: str = Field(default="Colombo", description="Service location")
    authorName: Optional[str] = Field(default=None, description="Author display name")
    authorEmail: Optional[str] = Field(default=None, description="Author email")
    createdAt: Optional[str] = Field(default=None, description="ISO timestamp of creation")
    likesCount: int = Field(default=0, description="Total likes")
    commentsCount: int = Field(default=0, description="Total comments count")
    images: List[str] = Field(default_factory=list, description="Post images")


class PostCreatedCard(BaseModel):
    """UI Card rendered when a new community post is successfully created."""
    id: Union[int, str] = Field(description="Post ID")
    title: str = Field(description="Post title")
    content: str = Field(description="Post body content")
    communityId: str = Field(default="General", description="Category or community identifier")
    location: str = Field(default="Colombo", description="Location of service/request")
    authorId: str = Field(description="Author user ID or email")
    authorName: Optional[str] = Field(default=None, description="Display name of author")
    status: str = Field(default="Active", description="Post status (e.g., Active)")
    images: List[str] = Field(default_factory=list, description="Attached post images")
    createdAt: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="Timestamp of creation"
    )


class PostListCard(BaseModel):
    """UI Card rendered for community post feed or category search results."""
    category: Optional[str] = Field(default="All", description="Active category filter")
    totalCount: int = Field(default=0, description="Total number of posts found")
    posts: List[CommunityPostSummary] = Field(default_factory=list, description="List of posts")
    page: int = Field(default=1, description="Current page number")


class PostDetailCard(BaseModel):
    """UI Card rendered when viewing a single community post in detail."""
    id: Union[int, str] = Field(description="Post ID")
    title: str = Field(description="Post title")
    content: str = Field(description="Full post content")
    communityId: str = Field(default="General", description="Category or community identifier")
    location: str = Field(default="Colombo", description="Location")
    authorName: Optional[str] = Field(default=None, description="Author name")
    authorEmail: Optional[str] = Field(default=None, description="Author email")
    createdAt: Optional[str] = Field(default=None, description="Creation timestamp")
    likesCount: int = Field(default=0, description="Number of likes")
    commentsCount: int = Field(default=0, description="Number of comments")
    comments: Optional[List[Dict[str, Any]]] = Field(default=None, description="Recent comments list")
    images: List[str] = Field(default_factory=list, description="Post images")


class PostUpdatedCard(BaseModel):
    """UI Card rendered when an existing community post is edited."""
    id: Union[int, str] = Field(description="Updated post ID")
    title: str = Field(description="New or updated title")
    content: str = Field(description="New or updated content")
    communityId: Optional[str] = Field(default=None, description="Updated category ID")
    location: Optional[str] = Field(default=None, description="Updated location")
    images: List[str] = Field(default_factory=list, description="Updated images")
    updatedAt: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="Timestamp of update"
    )


class PostDeletedCard(BaseModel):
    """UI Card rendered when a community post has been removed."""
    id: Union[int, str] = Field(description="Deleted post ID")
    status: str = Field(default="Removed", description="Current status of the post")
    message: str = Field(default="Community post successfully removed.", description="Feedback message")
    deletedAt: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="Timestamp of deletion"
    )


class UserProfileCard(BaseModel):
    """UI Card rendered for comprehensive user/worker profile information."""
    email: str = Field(description="User email address")
    role: str = Field(description="User role: 'Resident' or 'Worker'")
    isWorker: bool = Field(default=False, description="True if user has active worker profile")
    displayName: Optional[str] = Field(default=None, description="User full display name")
    phoneNo: Optional[str] = Field(default=None, description="Contact phone number")
    address: Optional[str] = Field(default=None, description="Resident address")
    workerRating: Optional[float] = Field(default=None, description="Average worker rating (1-5)")
    completedJobs: Optional[int] = Field(default=None, description="Total completed jobs")
    skills: Optional[List[str]] = Field(default=None, description="List of worker skills")
    pricingModel: Optional[str] = Field(default=None, description="Hourly or fixed pricing model")


class PostConfirmationCard(BaseModel):
    """
    UI Card rendered when a post draft requires user review and explicit confirmation
    before committing to the database.
    """
    action: Literal["create", "update"] = Field(description="'create' or 'update'")
    postId: Optional[Union[int, str]] = Field(default=None, description="Post ID if updating")
    title: str = Field(description="Drafted post title")
    content: str = Field(description="Drafted post body content")
    communityId: str = Field(default="General", description="Category or community identifier")
    location: str = Field(default="Colombo", description="Service location")
    urgency: Optional[str] = Field(default="As soon as possible", description="Service urgency level")
    authorId: Optional[str] = Field(default=None, description="Logged in author ID or email")
    authorName: Optional[str] = Field(default=None, description="Author display name")
    validationStatus: Literal["valid", "warning", "missing_info"] = Field(
        default="valid",
        description="Validation outcome: 'valid', 'warning', or 'missing_info'"
    )
    validationNotes: Optional[str] = Field(
        default="Please review your post details above before publishing to the community board.",
        description="Helper message or guidance notes"
    )
    images: List[str] = Field(
        default_factory=list,
        description="Attached or existing image URLs"
    )
    confirmPrompt: str = Field(
        description="Payload/prompt executed when user clicks Confirm & Publish / Update"
    )


class TextMessageCard(BaseModel):
    """UI Card rendered for conversational answers, clarifications, or greetings."""
    text: str = Field(description="Agent conversational message")
    suggestions: Optional[List[Union[str, Dict[str, Any]]]] = Field(
        default=None,
        description="Quick action suggestions/chips for user to click"
    )
    is_choice: Optional[bool] = Field(
        default=None,
        description="Whether this card represents an interactive choice turn"
    )


class ErrorCard(BaseModel):
    """UI Card rendered when an error or validation failure occurs."""
    errorCode: str = Field(description="Machine-readable error code")
    message: str = Field(description="User-friendly error explanation")
    actionRequired: Optional[str] = Field(
        default=None,
        description="Guidance on what action the user or system should take next"
    )


class ServiceCategoryItem(BaseModel):
    """A single service category item."""
    id: Optional[Union[int, str]] = Field(default=None, description="Category ID")
    name: str = Field(description="Category name (e.g., Plumbing, Electrical)")
    icon: Optional[str] = Field(default=None, description="Icon name or emoji")
    description: Optional[str] = Field(default=None, description="Short category description")


class ServiceCategoriesCard(BaseModel):
    """UI Card rendered when listing all available service categories."""
    categories: List[Any] = Field(default_factory=list, description="List of service category objects")
    totalCount: int = Field(default=0, description="Total number of categories")


class WorkerSummary(BaseModel):
    """Summary of a verified service worker for card display."""
    id: Union[int, str] = Field(description="Unique worker identifier")
    name: str = Field(description="Worker display name")
    profileImage: Optional[str] = Field(default=None, description="Avatar image URL")
    primaryRole: Optional[str] = Field(
        default="Verified Community Service Professional",
        description="Role title or short tagline"
    )
    skills: List[str] = Field(default_factory=list, description="Worker specialized skills")
    primaryServiceArea: Optional[str] = Field(default="Colombo", description="Service area or city")
    hourlyRate: Optional[float] = Field(default=None, description="Hourly rate in LKR")
    dailyRate: Optional[float] = Field(default=None, description="Daily rate in LKR")
    pricingModel: Optional[str] = Field(default="Hourly", description="Pricing model ('Hourly', 'Daily', 'Negotiable')")
    overallRating: Optional[float] = Field(default=5.0, description="Worker rating (1-5)")
    reviewCount: Optional[int] = Field(default=0, description="Number of reviews")
    completedJobs: Optional[int] = Field(default=0, description="Completed jobs count")
    isAvailable: bool = Field(default=True, description="Worker availability status")
    distance: Optional[float] = Field(default=None, description="Distance from resident in kilometers")


class WorkerListCard(BaseModel):
    """UI Card rendered when workers are searched, recommended, or listed."""
    category: Optional[str] = Field(default=None, description="Active trade or skill category")
    query: Optional[str] = Field(default=None, description="Search keyword")
    totalCount: int = Field(default=0, description="Total matching workers found")
    workers: List[WorkerSummary] = Field(default_factory=list, description="List of matching workers")


class BookingFormCard(BaseModel):
    """UI Card rendered when initiating or filling out a service booking request."""
    workerId: Union[int, str] = Field(description="Target worker identifier")
    workerName: str = Field(description="Name of the worker being booked")
    workerAvatar: Optional[str] = Field(default=None, description="Worker avatar image URL")
    category: Optional[str] = Field(default="General", description="Service category")
    hourlyRate: Optional[float] = Field(default=None, description="Worker hourly rate in LKR")
    location: Optional[str] = Field(default="Colombo", description="Resident service location")
    contactPhone: Optional[str] = Field(default=None, description="Contact phone number")
    selectedDate: Optional[str] = Field(default=None, description="Pre-filled date (YYYY-MM-DD)")
    selectedStartTime: Optional[str] = Field(default="09:00", description="Pre-filled start time (HH:MM)")
    durationHours: Optional[int] = Field(default=2, description="Duration in hours")
    jobTitle: Optional[str] = Field(default=None, description="Service title or problem description")
    description: Optional[str] = Field(default=None, description="Detailed problem description")
    priority: Optional[str] = Field(default="Normal", description="Priority level: Low, Normal, High, Urgent, Emergency")
    notes: Optional[str] = Field(default=None, description="Additional instructions for the worker")
    specificAddress: Optional[str] = Field(default=None, description="Specific street address")
    latitude: Optional[float] = Field(default=None, description="GPS latitude")
    longitude: Optional[float] = Field(default=None, description="GPS longitude")
    isAvailable: Optional[bool] = Field(default=True, description="Whether worker is currently verified available")
    availabilityStatus: Optional[str] = Field(default="Available", description="'Available', 'Busy', 'Checking'")
    availabilityReason: Optional[str] = Field(default=None, description="Explanation of availability")


class BookingConfirmationReviewCard(BaseModel):
    """UI Card rendered before final booking creation, summarizing appointment details with Yes/No confirmation buttons."""
    workerId: Union[int, str] = Field(description="Worker ID")
    workerName: str = Field(description="Worker display name")
    workerAvatar: Optional[str] = Field(default=None, description="Worker avatar/photo URL")
    category: Optional[str] = Field(default="General", description="Service category")
    jobTitle: str = Field(description="Service job title")
    description: Optional[str] = Field(default=None, description="Detailed problem description")
    priority: Optional[str] = Field(default="Normal", description="Booking priority level")
    scheduledDate: str = Field(description="Scheduled appointment date & time")
    locationAddress: str = Field(description="Service location")
    contactPhone: str = Field(description="Contact phone number")
    hourlyRate: Optional[float] = Field(default=None, description="Hourly rate in LKR")
    estimatedPrice: Optional[float] = Field(default=None, description="Estimated total in LKR")
    notes: Optional[str] = Field(default=None, description="Resident notes / instructions")
    confirmPrompt: Optional[str] = Field(default=None, description="Prompt to send on 'Yes' click")
    cancelPrompt: Optional[str] = Field(default=None, description="Prompt to send on 'No' click")


class BookingConfirmedCard(BaseModel):
    """UI Card rendered when a booking appointment is successfully created."""
    bookingId: Union[int, str] = Field(description="Created Booking ID")
    workerId: Union[int, str] = Field(description="Worker ID")
    workerName: str = Field(description="Worker display name")
    jobTitle: str = Field(description="Service job title")
    scheduledDate: str = Field(description="Scheduled appointment date & time")
    locationAddress: str = Field(description="Service location")
    contactPhone: str = Field(description="Contact phone number")
    status: str = Field(default="Confirmed", description="Booking status")


class BookingSummary(BaseModel):
    """Summary of an individual booking appointment."""
    id: Union[int, str] = Field(description="Booking ID")
    workerId: Union[int, str] = Field(description="Worker ID")
    workerName: str = Field(default="Verified Technician", description="Worker display name")
    workerProfileImage: Optional[str] = Field(default=None, description="Worker avatar/photo URL")
    workerPhone: Optional[str] = Field(default=None, description="Worker contact phone")
    jobTitle: str = Field(default="Home Service", description="Job title / service description")
    scheduledDate: Optional[str] = Field(default=None, description="Scheduled appointment date & time")
    locationAddress: Optional[str] = Field(default="Colombo", description="Service location")
    contactPhone: Optional[str] = Field(default=None, description="Resident contact phone")
    pricingModel: Optional[str] = Field(default="Hourly", description="Pricing model")
    estimatedPrice: Optional[float] = Field(default=None, description="Estimated price in LKR")
    agreedPrice: Optional[float] = Field(default=None, description="Agreed price in LKR")
    status: str = Field(default="Requested", description="Booking status: Requested, Confirmed, InProgress, Completed, Cancelled")
    createdAt: Optional[str] = Field(default=None, description="Timestamp created")


class BookingListCard(BaseModel):
    """UI Card rendered when displaying resident's bookings or appointment history."""
    totalCount: int = Field(default=0, description="Total count of bookings found")
    statusFilter: Optional[str] = Field(default="Upcoming", description="Filter applied: 'Upcoming', 'All', etc.")
    bookings: List[BookingSummary] = Field(default_factory=list, description="List of bookings")


class ReviewFormCard(BaseModel):
    """UI Card rendered when prompting the resident to review a completed service."""
    bookingId: Union[int, str] = Field(description="ID of the associated booking")
    workerId: Union[int, str] = Field(description="Worker ID")
    workerName: str = Field(default="Verified Technician", description="Technician display name")
    workerAvatar: Optional[str] = Field(default=None, description="Worker avatar URL")
    jobTitle: str = Field(default="Completed Service Appointment", description="Service job title")
    defaultQuality: int = Field(default=5, description="Initial quality star rating (1-5)")
    defaultPunctuality: int = Field(default=5, description="Initial punctuality star rating (1-5)")
    defaultCommunication: int = Field(default=5, description="Initial communication star rating (1-5)")
    suggestedComments: List[str] = Field(
        default_factory=lambda: [
            "Punctual, professional, and resolved the issue quickly!",
            "Great workmanship and left the work area clean.",
            "Polite communication and fair pricing. Highly recommended!"
        ],
        description="Quick pre-fill review template suggestions"
    )


class ReviewSubmittedCard(BaseModel):
    """UI Card rendered after a worker review is successfully recorded."""
    bookingId: Union[int, str] = Field(description="Booking ID")
    workerId: Union[int, str] = Field(description="Worker ID")
    workerName: str = Field(default="Verified Technician", description="Worker display name")
    overallRating: float = Field(default=5.0, description="Overall star rating given (1.0 - 5.0)")
    qualityRating: Optional[int] = Field(default=5, description="Quality rating")
    punctualityRating: Optional[int] = Field(default=5, description="Punctuality rating")
    communicationRating: Optional[int] = Field(default=5, description="Communication rating")
    comment: Optional[str] = Field(default=None, description="Review comment published")
    submittedAt: Optional[str] = Field(default=None, description="Formatted submission timestamp")


class DisputeTicketCard(BaseModel):
    """UI Card rendered when a support dispute ticket or complaint is opened."""
    ticketId: str = Field(description="Generated Support Ticket ID (e.g., TICKET-9481)")
    workerId: Optional[Union[int, str]] = Field(default=None, description="Target worker ID if applicable")
    workerName: Optional[str] = Field(default=None, description="Target worker name")
    bookingId: Optional[Union[int, str]] = Field(default=None, description="Associated booking ID if applicable")
    reason: str = Field(description="Summary of the issue / dispute description")
    urgencyLevel: str = Field(default="Medium", description="'Low', 'Medium', 'High', 'Critical'")
    status: str = Field(default="Open", description="Ticket status: 'Open', 'In Review', 'Resolved'")
    resolutionSla: str = Field(default="Support team responds within 2 hours", description="Expected response SLA")
    supportHotline: str = Field(default="+94 11 234 5678", description="Emergency platform support contact")


ResponseTypeLiteral = Literal[
    "create_community_post",
    "edit_community_post",
    "post_confirmation",
    "post_created",
    "post_list",
    "post_detail",
    "post_updated",
    "post_deleted",
    "user_profile",
    "service_categories",
    "worker_list",
    "booking_form",
    "booking_confirmation",
    "booking_confirmed",
    "booking_list",
    "review_form",
    "review_submitted",
    "dispute_ticket",
    "text_message",
    "error"
]


class AgentCardResponse(BaseModel):
    """
    Standard envelope returned to Frontend UI.
    Frontend checks `response_type` to mount the corresponding UI card component.
    """
    response_type: ResponseTypeLiteral = Field(
        description="Unique response type identifier used by frontend to choose UI Card"
    )
    message: str = Field(
        description="Human-readable conversational summary of the result"
    )
    card_data: Dict[str, Any] = Field(
        default_factory=dict,
        description="Payload matching the specific card schema for response_type"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional context (active agent, user email, timestamp, etc.)"
    )


class SpecialistConversationalOutput(BaseModel):
    """
    Structured Pydantic response format for specialist agents.
    Enforces clean, conversational messages without dumping repetitive
    raw data, markdown image embeds, phone numbers, or bullet lists that
    are already rendered visually by frontend UI cards.
    """
    message: str = Field(
        ...,
        description=(
            "A concise, friendly 1-2 sentence conversational introduction to the resident "
            "(e.g., 'Here are verified AC repair technicians available near Colombo. "
            "Would you like to book one of them or view more details?'). "
            "CRITICAL: Do NOT list individual workers, bullet points, telephone numbers, "
            "ratings, or markdown image tags in this message, because the frontend interactive "
            "UI card displays all worker photos, ratings, rates, and action buttons directly below."
        )
    )
    suggested_actions: Optional[List[str]] = Field(
        default_factory=list,
        description="Optional list of 2-3 quick suggestion chips for the user"
    )

