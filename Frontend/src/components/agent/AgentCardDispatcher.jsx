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

/**
 * Dispatcher component that examines `response_type` and renders the matching UI card.
 */
export default function AgentCardDispatcher({ response, onAction }) {
  if (!response) return null;

  const { response_type, message, card_data = {} } = response;

  // Render message bubble if present alongside card
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {message && response_type !== 'text_message' && (
        <div style={{ fontSize: '0.935rem', lineHeight: '1.5', color: '#1e293b' }}>
          {message}
        </div>
      )}

      {(() => {
        switch (response_type) {
          case 'post_confirmation':
            return <PostConfirmationCard data={card_data} onAction={onAction} />;
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
          case 'error':
            return <ErrorCard data={card_data} onAction={onAction} />;
          case 'text_message':
          default:
            return (
              <TextMessageCard
                data={{
                  text: card_data.text || message,
                  suggestions: card_data.suggestions,
                }}
                onAction={onAction}
              />
            );
        }
      })()}
    </div>
  );
}
