import { useState, useEffect, useCallback } from "react";

interface GoogleFile {
  id: string;
  name: string;
  mimeType?: string;
}

export const useGoogleAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [files, setFiles] = useState<GoogleFile[]>([]);
  const [loading, setLoading] = useState(false);

  // Sign in with Google
  const signIn = useCallback(async () => {
    try {
      setLoading(true);
      const result = await window.api.addGoogleDriveAccount();
      if (result?.success) setIsAuthenticated(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sign out from Google
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      await window.api.signOutGoogleDrive();
      setIsAuthenticated(false);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // List files
  const listFiles = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Attempting to list Google Drive files...');
      
      // First check if we have a valid token
      try {
        const token = await window.api.getGoogleDriveToken();
        console.log('Current auth token:', token ? 'Token exists' : 'No token found');
      } catch (tokenError) {
        console.error('Error checking auth token:', tokenError);
      }
      
      const driveFiles = await window.api.listGoogleDriveFiles();
      console.log(driveFiles)
      // console.log('Files received from API:', {
      //   count: driveFiles?.length || 0,
      //   files: driveFiles?.slice(0, 3) // Log first 3 files to avoid cluttering
      // });
      
      if (!driveFiles) {
        console.error('No files returned from API');
        return;
      }
      
      setFiles(driveFiles);
    } catch (error) {
      console.error('Error in listFiles:', error);
      // Re-throw to allow error handling in the component
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Optionally, check if already authenticated on mount
  // useEffect(() => {
  //   const checkAuth = async () => {
  //     const token = await window.api.getGoogleDriveToken();
  //     if (token) setIsAuthenticated(true);
  //   };
  //   checkAuth();
  // }, []);

  return { isAuthenticated, signIn, signOut, files, listFiles, loading };
};
