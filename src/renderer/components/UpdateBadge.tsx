import React, { useState, useEffect } from 'react';

const UpdateBadge: React.FC = () => {
  const [version, setVersion] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const handleUpdateAvailable = (_event: any, newVersion: string) => {
      setVersion(newVersion);
    };

    const handleError = (_event: any, error: string) => {
      console.error('Update error:', error);
    };

    // The main process handles the actual update installation automatically
    // after the download is complete
    window.api.onUpdateAvailable(handleUpdateAvailable);
    window.api.onUpdateDownloaded(() => {
      // The main process will handle the installation
      // This is just a no-op to satisfy the event listener
    });
    window.api.onUpdateError(handleError);
  }, []);

  if (!version) return null;

  return (
    <div 
      className="px-3 py-1 text-xs text-white bg-blue-500 rounded-full cursor-pointer hover:bg-blue-600"
      onClick={() => window.api.installUpdate()}
    >
      {isUpdating ? 'Updating...' : `Update to v${version} available`}
    </div>
  );
};

export default UpdateBadge;
