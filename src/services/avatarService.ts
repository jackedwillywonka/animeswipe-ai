import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

/**
 * Lets the user pick an image, uploads it to the 'avatars' storage bucket,
 * saves the public URL to their profile, and returns that URL.
 * Returns null if the user cancels or something fails.
 */
export async function pickAndUploadAvatar(userId: string): Promise<string | null> {
  if (!userId) return null;

  // Ask permission + open the photo library
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],       // square crop
    quality: 0.7,          // compress so files stay small
  });
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];

  try {
    // Read the image into bytes
    const response = await fetch(asset.uri);
    const arrayBuffer = await response.arrayBuffer();

    // One stable path per user, overwritten on each change
    const ext = (asset.uri.split('.').pop() || 'jpg').split('?')[0];
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, arrayBuffer, {
        contentType: asset.mimeType || `image/${ext}`,
        upsert: true, // replace the old one
      });
    if (uploadError) {
      console.warn('[avatar] upload failed', uploadError.message);
      return null;
    }

    // Public URL (bucket is public). Cache-bust so the new pic shows immediately.
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

    // Save to the profile
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);

    return publicUrl;
  } catch (e) {
    console.warn('[avatar] error', e);
    return null;
  }
}

/** Fetch the saved avatar URL for a user (null if none set). */
export async function getAvatarUrl(userId: string): Promise<string | null> {
  if (!userId) return null;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .maybeSingle();
    return data?.avatar_url ?? null;
  } catch {
    return null;
  }
}
