// src/components/common/Notification.jsx
import React from 'react';
import { useApp } from '../../contexts/AppContext';

const Notification = () => {
  const { notification } = useApp();

  if (!notification) return null;

  return (
    <div className={`fixed top-6 right-6 z-50 animate-fadeIn ${
      notification.type === 'success' 
        ? 'bg-black border border-neutral-800'
        : 'bg-black border border-red-900/50'
    }`}>
      <div className="px-6 py-4">
        <p className={`text-sm font-normal ${
          notification.type === 'success' ? 'text-white' : 'text-red-400'
        }`}>
          {notification.message}
        </p>
      </div>
    </div>
  );
};

export default Notification;