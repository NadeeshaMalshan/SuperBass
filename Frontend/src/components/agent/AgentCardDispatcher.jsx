import CreateCommunityPostCard from './CreateCommunityPostCard.jsx';
import EditCommunityPostCard from './EditCommunityPostCard.jsx';
import PostConfirmationCard from './PostConfirmationCard.jsx';
import PostCreatedCard from './PostCreatedCard.jsx';
import PostListCard from './PostListCard.jsx';
import PostDetailCard from './PostDetailCard.jsx';
import PostUpdatedCard from './PostUpdatedCard.jsx';
import PostDeletedCard from './PostDeletedCard.jsx';
import UserProfileCard from './UserProfileCard.jsx';
import TextMessageCard from './TextMessageCard.jsx';
import ErrorCard from './ErrorCard.jsx';
import ServiceCategoriesCard from './ServiceCategoriesCard.jsx';
import WorkerListCard from './WorkerListCard.jsx';
import BookingFormCard from './BookingFormCard.jsx';
import BookingConfirmedCard from './BookingConfirmedCard.jsx';
import InitialWelcomeCard from './InitialWelcomeCard.jsx';

/**
 * Dispatcher component that examines `response_type` and renders the matching UI card.
 */
export default function AgentCardDispatcher({ response, onAction }) {
  if (!response) return null;

  const { response_type, message, card_data = {} } = response;

  switch (response_type) {
    case 'initial_welcome':
      return <InitialWelcomeCard data={card_data} onAction={onAction} />;
    case 'create_community_post':
      return <CreateCommunityPostCard data={card_data} onAction={onAction} />;
    case 'edit_community_post':
      return <EditCommunityPostCard data={card_data} onAction={onAction} />;
    case 'post_confirmation':
      if (card_data?.action === 'update' || Boolean(card_data?.postId)) {
        return <EditCommunityPostCard data={card_data} onAction={onAction} />;
      }
      return <CreateCommunityPostCard data={card_data} onAction={onAction} />;
    case 'post_created':
      return <PostCreatedCard data={card_data} onAction={onAction} />;

    case 'post_list':
      return <PostListCard data={card_data} onAction={onAction} />;
    case 'post_detail':
      return <PostDetailCard data={card_data} onAction={onAction} />;
    case 'post_updated':
      return <PostUpdatedCard data={card_data} onAction={onAction} />;
    case 'post_deleted':
      return <PostDeletedCard data={card_data} onAction={onAction} />;
    case 'user_profile':
      return <UserProfileCard data={card_data} onAction={onAction} />;
    case 'service_categories':
      return <ServiceCategoriesCard data={card_data} onAction={onAction} />;
    case 'worker_list':
      return <WorkerListCard data={card_data} onAction={onAction} />;
    case 'booking_form':
      return <BookingFormCard data={card_data} onAction={onAction} />;
    case 'booking_confirmed':
      return <BookingConfirmedCard data={card_data} onAction={onAction} />;
    case 'error':
      return <ErrorCard data={card_data} onAction={onAction} />;
    case 'text_message':
    default:
            return (
              <TextMessageCard
                data={{
                  ...card_data,
                  text: card_data.text || message,
                  suggestions: card_data.suggestions,
                }}
                onAction={onAction}
              />
            );
  }
}
