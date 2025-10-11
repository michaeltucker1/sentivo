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

  // Optionally, check if already authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = await window.api.getGoogleDriveToken();
      if (token) setIsAuthenticated(true);
    };
    checkAuth();
  }, []);

  return { isAuthenticated, signIn, signOut, files, loading };
};
