/**
 * Generates the correct Google Cloud Console URL for a given connector or data store ID.
 * Handles the distinction between default_collection data stores and 1P/3P custom connectors.
 *
 * @param {string} connectorId The connector ID or data store ID.
 * @param {string} engineId The Gemini Enterprise engine ID.
 * @param {string} projectId The Google Cloud project ID.
 * @returns {string} The formatted console URL.
 */
export function getConsoleUrl(connectorId, engineId, projectId) {
  if (!connectorId) return '';
  
  // Distinguish default_collection data stores from custom SaaS connectors.
  // Data stores inside default_collection usually end with "-ds", contain "-ds_", or end with "ds-v".
  const isDataStore = connectorId.endsWith('-ds') || 
                      connectorId.includes('-ds_') || 
                      connectorId.includes('-ds-v') ||
                      connectorId === 'yahoo-gmail-ds' ||
                      connectorId === 'yahoo-calendar-ds';
  
  if (isDataStore) {
    return `https://console.cloud.google.com/gemini-enterprise/locations/global/engines/${engineId}/collections/default_collection/data-stores/${connectorId}/data/documents?project=${projectId}`;
  } else {
    // 1P/3P custom connector with specific collection ID (strip slack or gdrive details)
    const collectionId = connectorId.split('_google_drive')[0]
                                    .split('_conversation')[0]
                                    .split('_file')[0]
                                    .split('_message')[0];
    return `https://console.cloud.google.com/gemini-enterprise/locations/global/engines/${engineId}/collections/${collectionId}/connector/entities?project=${projectId}`;
  }
}
