/**
 * Firestore REST API Service
 *
 * Wraps Firestore REST API calls for iOS compatibility
 * Uses simple fetch() which works reliably on iOS WebView
 */

const FIRESTORE_BASE_URL = 'https://firestore.googleapis.com/v1';
const PROJECT_ID = 'tarteel-quran';

/**
 * Parse Firestore REST API response to plain JavaScript object
 */
function parseFirestoreDocument(doc) {
  const data = {};

  if (!doc.fields) return data;

  for (const [key, value] of Object.entries(doc.fields)) {
    if (value.stringValue !== undefined) {
      data[key] = value.stringValue;
    } else if (value.integerValue !== undefined) {
      data[key] = parseInt(value.integerValue);
    } else if (value.doubleValue !== undefined) {
      data[key] = parseFloat(value.doubleValue);
    } else if (value.booleanValue !== undefined) {
      data[key] = value.booleanValue;
    } else if (value.timestampValue !== undefined) {
      data[key] = new Date(value.timestampValue);
    } else if (value.arrayValue !== undefined) {
      data[key] = (value.arrayValue.values || []).map(v => {
        if (v.stringValue !== undefined) return v.stringValue;
        if (v.integerValue !== undefined) return parseInt(v.integerValue);
        return v;
      });
    } else if (value.mapValue !== undefined) {
      data[key] = parseFirestoreDocument({ fields: value.mapValue.fields || {} });
    } else if (value.nullValue !== undefined) {
      data[key] = null;
    }
  }

  return data;
}

/**
 * Get a single document by path
 * @param {string} path - Document path like "users/userId"
 * @param {string} idToken - Firebase auth token
 */
export async function getDocument(path, idToken) {
  const url = `${FIRESTORE_BASE_URL}/projects/${PROJECT_ID}/databases/(default)/documents/${path}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    if (response.status === 404) {
      return { exists: false, data: null };
    }
    throw new Error(`Firestore GET failed: ${response.status}`);
  }

  const doc = await response.json();
  return {
    exists: true,
    data: parseFirestoreDocument(doc),
    id: doc.name.split('/').pop()
  };
}

/**
 * Query a collection
 * @param {string} collectionPath - Collection path like "users"
 * @param {Object} options - Query options
 * @param {string} idToken - Firebase auth token
 */
export async function queryCollection(collectionPath, options = {}, idToken) {
  const url = `${FIRESTORE_BASE_URL}/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;

  // Build structured query
  const query = {
    structuredQuery: {
      from: [{ collectionId: collectionPath }],
      limit: options.limit || 100
    }
  };

  // Add where filters
  if (options.where) {
    query.structuredQuery.where = {
      fieldFilter: {
        field: { fieldPath: options.where.field },
        op: options.where.op || 'EQUAL',
        value: convertToFirestoreValue(options.where.value)
      }
    };
  }

  // Add orderBy
  if (options.orderBy) {
    query.structuredQuery.orderBy = [{
      field: { fieldPath: options.orderBy.field },
      direction: options.orderBy.direction || 'ASCENDING'
    }];
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(query)
  });

  if (!response.ok) {
    throw new Error(`Firestore query failed: ${response.status}`);
  }

  const results = await response.json();

  // Parse results
  const docs = [];
  for (const result of results) {
    if (result.document) {
      docs.push({
        id: result.document.name.split('/').pop(),
        data: parseFirestoreDocument(result.document)
      });
    }
  }

  return docs;
}

/**
 * Convert JavaScript value to Firestore value format
 */
function convertToFirestoreValue(value) {
  if (typeof value === 'string') {
    return { stringValue: value };
  } else if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { integerValue: value.toString() }
      : { doubleValue: value };
  } else if (typeof value === 'boolean') {
    return { booleanValue: value };
  } else if (value === null) {
    return { nullValue: null };
  } else if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  } else if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(v => convertToFirestoreValue(v))
      }
    };
  } else if (typeof value === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(value)) {
      fields[k] = convertToFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

/**
 * Get auth token from localStorage or current user
 */
export function getAuthToken() {
  return localStorage.getItem('firebase_token') || null;
}

export default {
  getDocument,
  queryCollection,
  getAuthToken
};
