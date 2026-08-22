import React, { useState } from 'react';
import WorkerLayout from './WorkerLayout.jsx';

export default function WorkerJobs() {
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'active' | 'history'

  const [requests, setRequests] = useState([
    {
      id: 101,
      title: 'Leaking Bathroom Pipe Repair',
      resident: 'Kamal Perera',
      location: 'Colombo 03',
      date: 'Tomorrow at 10:00 AM',
      estimate: 'LKR 2,500',
      urgency: 'High'
    },
    {
      id: 102,
      title: 'Main Switch Board Tripping Inspection',
      resident: 'Nimal Silva',
      location: 'Rajagiriya',
      date: 'Saturday at 2:00 PM',
      estimate: 'LKR 3,000',
      urgency: 'Medium'
    }
  ]);

  const [activeJobs, setActiveJobs] = useState([
    {
      id: 98,
      title: 'Kitchen Sink Tap Replacement',
      resident: 'Saman Jayasinghe',
      location: 'Nugegoda',
      status: 'En Route',
      scheduled: 'Today at 4:30 PM'
    }
  ]);

  const [history] = useState([
    {
      id: 85,
      title: 'Ceiling Fan Wiring Repair',
      resident: 'Kavinda Perera',
      location: 'Maharagama',
      completedDate: 'Yesterday',
      amount: 'LKR 3,500',
      rating: 5.0
    },
    {
      id: 80,
      title: 'Water Pump Capacitor Replacement',
      resident: 'Sunil Cooray',
      location: 'Battaramulla',
      completedDate: '15 Aug 2026',
      amount: 'LKR 4,200',
      rating: 4.8
    }
  ]);

  const handleAcceptRequest = (id) => {
    const jobToMove = requests.find(r => r.id === id);
    if (jobToMove) {
      setRequests(requests.filter(r => r.id !== id));
      setActiveJobs([...activeJobs, {
        id: jobToMove.id,
        title: jobToMove.title,
        resident: jobToMove.resident,
        location: jobToMove.location,
        status: 'Scheduled',
        scheduled: jobToMove.date
      }]);
    }
  };

  const handleDeclineRequest = (id) => {
    setRequests(requests.filter(r => r.id !== id));
  };

  return (
    <WorkerLayout activeTab="jobs">
      <div className="page-title-block">
        <h1 className="page-title">My Jobs & Booking Requests</h1>
        <p className="page-subtitle">Manage incoming job requests, update live status for active work, and view past job history.</p>
      </div>

      {/* Sub Tabs */}
      <div className="profile-tabs-nav">
        <button 
          className={`profile-tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <i className="fa-solid fa-bell"></i>
          Booking Requests ({requests.length})
        </button>

        <button 
          className={`profile-tab-btn ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          <i className="fa-solid fa-person-digging"></i>
          Active Jobs ({activeJobs.length})
        </button>

        <button 
          className={`profile-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <i className="fa-solid fa-clock-rotate-left"></i>
          Job History ({history.length})
        </button>
      </div>

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {requests.length === 0 ? (
            <div className="worker-card" style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
              No pending booking requests at the moment.
            </div>
          ) : (
            requests.map(req => (
              <div key={req.id} className="worker-card" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span className="badge badge-warning" style={{ marginBottom: '8px' }}>
                      {req.urgency} Urgency
                    </span>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111111' }}>{req.title}</h3>
                    <p style={{ fontSize: '0.9rem', color: '#64748B', marginTop: '4px' }}>
                      Resident: <strong style={{ color: '#1E293B' }}>{req.resident}</strong> • Location: <strong>{req.location}</strong>
                    </p>
                    <p style={{ fontSize: '0.875rem', color: '#2563EB', fontWeight: 600, marginTop: '4px' }}>
                      📅 Scheduled: {req.date} | Estimated: {req.estimate}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="worker-btn-primary" onClick={() => handleAcceptRequest(req.id)}>
                      Accept Job
                    </button>
                    <button className="worker-btn-outlined" onClick={() => handleDeclineRequest(req.id)}>
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Active Jobs Tab */}
      {activeTab === 'active' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activeJobs.length === 0 ? (
            <div className="worker-card" style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
              No active jobs in progress right now.
            </div>
          ) : (
            activeJobs.map(job => (
              <div key={job.id} className="worker-card" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span className="badge badge-success" style={{ marginBottom: '8px' }}>
                      Status: {job.status}
                    </span>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111111' }}>{job.title}</h3>
                    <p style={{ fontSize: '0.9rem', color: '#64748B', marginTop: '4px' }}>
                      Resident: <strong style={{ color: '#1E293B' }}>{job.resident}</strong> • Location: <strong>{job.location}</strong>
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="worker-btn-outlined" onClick={() => alert('Updated status to In Progress')}>
                      Mark as In Progress
                    </button>
                    <button className="worker-btn-primary" onClick={() => alert('Marked job as completed!')}>
                      Mark Completed
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {history.map(item => (
            <div key={item.id} className="worker-card" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111111' }}>{item.title}</h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '4px' }}>
                    {item.resident} • {item.location} • Completed: {item.completedDate}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#2563EB' }}>{item.amount}</div>
                  <div style={{ color: '#F59E0B', fontSize: '0.85rem', fontWeight: 700, marginTop: '2px' }}>★ {item.rating}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </WorkerLayout>
  );
}
