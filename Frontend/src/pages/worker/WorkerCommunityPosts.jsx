import React from 'react';
import WorkerLayout from './WorkerLayout.jsx';
import MyCommunityPostsManager from '../../components/MyCommunityPostsManager.jsx';

export default function WorkerCommunityPosts() {
  const userEmail = localStorage.getItem('workerEmail') || localStorage.getItem('email');
  const userName = localStorage.getItem('userName');
  const userPicture = localStorage.getItem('userPicture');

  return (
    <WorkerLayout activeTab="community-posts">
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <MyCommunityPostsManager
          userEmail={userEmail}
          userName={userName}
          userPicture={userPicture}
          role="Worker"
        />
      </div>
    </WorkerLayout>
  );
}
