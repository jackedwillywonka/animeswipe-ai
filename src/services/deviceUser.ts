import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Until real Apple/Google auth lands, we identify a user by a stable
 * random ID stored on the device. This persists across app launches,
 * so the backend remembers "you" between sessions.
 *
 * When real auth arrives, this gets replaced by the authenticated user id.
 */

const KEY = 'animeswipe_device_user_id';

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let cachedId: string | null = null;

export async function getDeviceUserId(): Promise<string> {
  if (cachedId) return cachedId;
  let id = await AsyncStorage.getItem(KEY);
  if (!id) {
    id = uuidv4();
    await AsyncStorage.setItem(KEY, id);
  }
  cachedId = id;
  return id;
}
