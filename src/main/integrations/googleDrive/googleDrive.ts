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
    // Request specific fields to reduce response size
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

    // let allFiles: DriveFile[] = [];
    // let pageToken: string | undefined;
    // let retryCount = 0;
    // const maxRetries = 3;

    // do {
    //   try {
    //     const params = new URLSearchParams({
    //       fields,
    //       pageSize: '10', // Maximum allowed by API
    //       includeItemsFromAllDrives: 'true',
    //       supportsAllDrives: 'true',
    //       ...(pageToken && { pageToken }),
    //     });

    //     const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;
    //     console.log('Making request to:', url);

    //     const res = await fetch(url, {
    //       headers: { 
    //         'Authorization': `Bearer ${token}`,
    //         'Accept': 'application/json',
    //       },
    //     });

    //     if (!res.ok) {
    //       const errorText = await res.text();
    //       console.error('Drive API error response:', errorText);
    //       throw new Error(`Drive API error: ${res.status} ${res.statusText}`);
    //     }

    //     const data = await res.json();
    //     console.log(`Received ${data.files?.length || 0} files in this batch`);
        
    //     if (data.files && Array.isArray(data.files)) {
    //       allFiles = [...allFiles, ...data.files];
    //     }
        
    //     pageToken = data.nextPageToken;
    //     console.log(pageToken)
    //     retryCount = 0; // Reset retry count on successful request
    //   } catch (error) {
    //     console.error('Error fetching files:', error);
    //     retryCount++;
        
    //     if (retryCount > maxRetries) {
    //       console.error(`Max retries (${maxRetries}) exceeded, giving up`);
    //       throw error;
    //     }
        
    //     // Exponential backoff before retry
    //     const delayMs = Math.pow(2, retryCount) * 1000;
    //     console.log(`Retrying in ${delayMs}ms... (attempt ${retryCount}/${maxRetries})`);
    //     await new Promise(resolve => setTimeout(resolve, delayMs));
    //   }
    // } while (pageToken);

    // console.log(`Total files fetched: ${allFiles.length}`);
    
    // // Transform the data to match the expected format
    // return allFiles.map(file => {
    //   const owner = Array.isArray(file.owners) ? file.owners[0] : null;
    //   const lastModifier = file.lastModifyingUser || null;
      
    //   // Log a sample of the file data for debugging
    //   if (allFiles.indexOf(file) < 3) { // Only log first 3 files for brevity
    //     console.log('Sample file data:', {
    //       id: file.id,
    //       name: file.name,
    //       mimeType: file.mimeType,
    //       modifiedTime: file.modifiedTime,
    //       createdTime: file.createdTime,
    //       size: file.size,
    //       hasThumbnail: file.hasThumbnail,
    //       webViewLink: file.webViewLink
    //     });
    //   }
      
    //   return {
    //     id: file.id,
    //     title: file.name,
    //     document_type: file.mimeType,
    //     date_modified: file.modifiedTime,
    //     date_created: file.createdTime,
    //     file_extension: file.fileExtension || '',
    //     full_file_extension: file.fullFileExtension || '',
    //     file_size: file.size ? `${Math.ceil(Number(file.size) / 1024)} KB` : 'N/A',
    //     parents: file.parents || [],
    //     web_view_link: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
    //     download_link: file.webContentLink || null,
    //     thumbnail_link: file.thumbnailLink || null,
    //     has_thumbnail: file.hasThumbnail || false,
    //     shared: file.shared || false,
    //     owner: owner ? {
    //       name: owner.displayName,
    //       email: owner.emailAddress
    //     } : null,
    //     last_modified_by: lastModifier ? {
    //       name: lastModifier.displayName,
    //       email: lastModifier.emailAddress
    //     } : null,
    //     capabilities: file.capabilities || {},
    //     checksum: file.md5Checksum || file.fileMd5Checksum || null,
    //     original_filename: file.originalFilename || file.name,
    //     description: file.description || '',
    //     starred: file.starred || false,
    //     trashed: file.trashed || file.explicitlyTrashed || false,
    //     properties: file.properties || {},
    //     app_properties: file.appProperties || {},
    //     spaces: file.spaces || [],
    //     version: file.version || '1.0',
    //     mime_type: file.mimeType || 'application/octet-stream',
    //     is_google_doc: file.mimeType?.startsWith('application/vnd.google-apps.') || false
    //   };
    // });
  } catch (error) {
    console.error('Error in listDriveFiles:', error);
    throw error;
  }
};

