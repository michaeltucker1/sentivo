import React, { useState, useEffect } from 'react';

interface UpdateState {
  isUpdateAvailable: boolean;
  isDownloaded: boolean;
  isUpdating: boolean;
  version: string;
  progress: number;
  error: string | null;
}

const UpdateBadge: React.FC = () => {
  const [state, setState] = useState<UpdateState>({
    isUpdateAvailable: false,
    isDownloaded: false,
    isUpdating: false,
    version: '',
    progress: 0,
    error: null,
  });

  useEffect(() => {
    // Type assertion to access the api object
    const api = window.api as any;

    const handleUpdateEvent = (_event: any, { event, state: updateState }: any) => {
      switch (event) {
        case 'update-available':
          setState(prev => ({
            ...prev,
            isUpdateAvailable: true,
            version: updateState.version,
            isUpdating: false,
            error: null
          }));
          break;

        case 'download-progress':
          setState(prev => ({
            ...prev,
            progress: updateState.progress,
            isUpdating: true
          }));
          break;

        case 'update-downloaded':
          setState(prev => ({
            ...prev,
            isDownloaded: true,
            isUpdating: false,
            progress: 100
          }));
          break;

        case 'error':
          setState(prev => ({
            ...prev,
            isUpdating: false,
            error: updateState.error
          }));
          break;

        case 'checking-for-update':
          setState(prev => ({
            ...prev,
            isUpdating: true,
            error: null
          }));
          break;

        case 'update-not-available':
          setState(prev => ({
            ...prev,
            isUpdating: false,
            isUpdateAvailable: false
          }));
          break;
      }
    };

    // Initial state check
    const checkStatus = async () => {
      try {
        const status = await api.getUpdateStatus();
        setState(prev => ({
          ...prev,
          isUpdateAvailable: status.isUpdateAvailable,
          isDownloaded: status.isDownloaded,
          version: status.version || '',
          error: status.error || null
        }));
      } catch (error) {
        console.error('Error checking update status:', error);
      }
    };

    // Set up event listeners
    api.onUpdateAvailable((event: any, data: any) => handleUpdateEvent(event, data));
    api.onDownloadProgress((event: any, data: any) => handleUpdateEvent(event, data));
    api.onUpdateDownloaded((event: any, data: any) => handleUpdateEvent(event, data));
    api.onError((event: any, data: any) => handleUpdateEvent(event, data));

    // Initial check
    checkStatus();

    // Cleanup
    return () => {
      api.onUpdateAvailable(() => {});
      api.onDownloadProgress(() => {});
      api.onUpdateDownloaded(() => {});
      api.onError(() => {});
    };
  }, []);

  const handleUpdateClick = async () => {
    try {
      setState(prev => ({ ...prev, isUpdating: true, error: null }));

      if (!state.isDownloaded) {
        // If not downloaded, download the update first
        const result = await window.api.downloadUpdate();
        if (!result.success) {
          throw new Error(result.error || 'Failed to download update');
        }
      } else {
        // If already downloaded, install it
        const result = await window.api.installUpdate();
        if (!result.success) {
          throw new Error(result.error || 'Failed to install update');
        }
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isUpdating: false
      }));
    }
  };

  if (!state.isUpdateAvailable && !state.error) {
    return null;
  }

  if (state.error) {
    return (
      <div
        className="flex items-center justify-center px-3 py-1 text-xs text-white bg-red-500 rounded-full cursor-pointer hover:bg-red-600 transition-colors"
        onClick={handleUpdateClick}
        title={state.error}
      >
        <span className="truncate max-w-[180px]">Update Error: {state.error}</span>
      </div>
    );
  }

  if (state.isDownloaded) {
    return (
      <div
        className="flex items-center justify-center px-3 py-1 text-xs text-white bg-green-500 rounded-full cursor-pointer hover:bg-green-600 transition-colors"
        onClick={handleUpdateClick}
        title={`Version ${state.version} is ready to install`}
      >
        <span>Restart to update to v{state.version}</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center px-3 py-1 text-xs text-white bg-blue-500 rounded-full cursor-pointer hover:bg-blue-600 transition-colors ${state.isUpdating ? 'opacity-75' : ''}`}
      onClick={!state.isUpdating ? handleUpdateClick : undefined}
      title={state.isUpdating ? `Downloading update... ${state.progress}%` : `Update to v${state.version} available`}
    >
      {state.isUpdating ? (
        <span className="flex items-center">
          <svg className="w-3 h-3 mr-1 -ml-1 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {state.progress}%
        </span>
      ) : (
        <span>Update to v{state.version}</span>
      )}
    </div>
  );
};

export default UpdateBadge;
