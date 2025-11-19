import { GoogleAuth } from "./googleAuth.js";

let googleAuth: GoogleAuth | null = null;

/**
 * Initialize the GoogleAuth instance with your client ID.
 */
export const initGoogleDriveAuth = (clientId: string, clientSecret: string) => {
  googleAuth = new GoogleAuth(clientId, clientSecret);
};

/**
 * Get the existing GoogleAuth instance.
 */
export const getGoogleAuthInstance = () => {
  if (!googleAuth) throw new Error("GoogleAuth not initialized.");
  return googleAuth;
};

/**
 * List files from Google Drive using the access token.
 * @returns Array of file objects with detailed information
 */
export const listDriveFiles = async () => {
  console.log('listDriveFiles called');
  const auth = getGoogleAuthInstance();
  const token = await auth.getAccessToken();
  
  if (!token) {
    console.error('No access token available');
    throw new Error("Not authenticated with Google Drive.");
  }

  console.log('Using access token:', token.substring(0, 10) + '...');

  try {
    const fields = [
      'files(' +
        'id, name, mimeType, modifiedTime, ' +
        'webViewLink, thumbnailLink' +
      ')',
      'nextPageToken',
      'kind',
      'incompleteSearch'
    ].join(',');

    try {
      const params = new URLSearchParams({
        fields,
        pageSize: '10', // Maximum allowed by API
        includeItemsFromAllDrives: 'true',
        supportsAllDrives: 'true',
      });

      const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;
      console.log('Making request to:', url);

      const res = await fetch(url, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Drive API error response:', errorText);
        throw new Error(`Drive API error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      console.log('Received response:', data);
      return data;
    } catch (error) {
      console.error('Error fetching files:', error);
      throw error;
    }

  } catch (error) {
    console.error('Error in listDriveFiles:', error);
    throw error;
  }
};

