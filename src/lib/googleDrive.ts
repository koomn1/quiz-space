/**
 * Service for Google Drive integration to sync user progress.
 */

export interface SyncedFileMeta {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
}

/**
 * Searches for the main "Quiz Space Progress" folder.
 */
export async function findProgressFolder(accessToken: string): Promise<string | null> {
  const query = encodeURIComponent("name = 'Quiz Space Progress' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;
  
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Google Drive] Failed to query folders:", errText);
      return null;
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  } catch (err) {
    console.error("[Google Drive] Error in findProgressFolder:", err);
  }
  return null;
}

/**
 * Creates the "Quiz Space Progress" folder on the user's Google Drive.
 */
export async function createProgressFolder(accessToken: string): Promise<string | null> {
  const url = "https://www.googleapis.com/drive/v3/files";
  
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Quiz Space Progress",
        mimeType: "application/vnd.google-apps.folder",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Google Drive] Failed to create folder:", errText);
      return null;
    }

    const data = await res.json();
    return data.id;
  } catch (err) {
    console.error("[Google Drive] Error in createProgressFolder:", err);
  }
  return null;
}

/**
 * Lists all JSON progress files inside the "Quiz Space Progress" folder.
 */
export async function listSyncedFiles(accessToken: string, folderId: string): Promise<SyncedFileMeta[]> {
  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,size)`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Google Drive] Failed to list files:", errText);
      return [];
    }

    const data = await res.json();
    return data.files || [];
  } catch (err) {
    console.error("[Google Drive] Error listSyncedFiles:", err);
  }
  return [];
}

/**
 * Finds if a file with the given name exists in the parents folder.
 */
async function findFileInFolder(accessToken: string, folderId: string, filename: string): Promise<string | null> {
  const query = encodeURIComponent(`name = '${filename}' and '${folderId}' in parents and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }
  } catch (err) {
    console.error("[Google Drive] findFileInFolder error:", err);
  }
  return null;
}

/**
 * Uploads or updates a file inside a specific folder.
 */
export async function uploadOrUpdateFile(
  accessToken: string,
  folderId: string,
  filename: string,
  content: any
): Promise<string | null> {
  try {
    // 1. Check if file already exists in folder
    let fileId = await findFileInFolder(accessToken, folderId, filename);

    if (!fileId) {
      // Create metadata first if file doesn't exist
      const metaUrl = "https://www.googleapis.com/drive/v3/files";
      const metaRes = await fetch(metaUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: filename,
          parents: [folderId],
          mimeType: "application/json",
        }),
      });

      if (!metaRes.ok) {
        const metaErr = await metaRes.text();
        console.error("[Google Drive] Error creating file metadata:", metaErr);
        return null;
      }

      const metaData = await metaRes.json();
      fileId = metaData.id;
    }

    if (!fileId) return null;

    // 2. Upload media content
    const mediaUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
    const mediaRes = await fetch(mediaUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(content, null, 2),
    });

    if (!mediaRes.ok) {
      const mediaErr = await mediaRes.text();
      console.error("[Google Drive] Error updating file content:", mediaErr);
      return null;
    }

    return fileId;
  } catch (err) {
    console.error("[Google Drive] uploadOrUpdateFile unexpected error:", err);
  }
  return null;
}
