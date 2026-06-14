import { Geolocation } from '@capacitor/geolocation';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { supabase } from '../context/AuthContext';

// Helper to check if we are running in a native mobile environment (Capacitor)
export const isNative = () => {
  return window.Capacitor !== undefined && window.Capacitor.platform !== 'web';
};

// ─── GEOLOCATION WRAPPER ───────────────────────────────────────────────────
export const getCurrentLocation = async () => {
  try {
    // 1. Native mobile flow
    if (isNative()) {
      const permission = await Geolocation.checkPermissions();
      if (permission.location !== 'granted') {
        const req = await Geolocation.requestPermissions();
        if (req.location !== 'granted') {
          throw new Error('Location permission denied.');
        }
      }
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });
      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        source: 'gps'
      };
    }
  } catch (err) {
    console.warn('Capacitor Geolocation failed, trying browser fallback:', err);
  }

  // 2. Web browser fallback flow
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: 'browser'
        });
      },
      (err) => {
        console.error('Browser geolocation failed:', err);
        // Default Harare coordinates fallback so the user is not blocked
        resolve({
          lat: -17.8292,
          lng: 31.0522,
          accuracy: null,
          source: 'default'
        });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
};

// ─── CAMERA / IMAGE UPLOAD WRAPPER ─────────────────────────────────────────
export const takePhotoAndUpload = async (onProgress = () => {}) => {
  try {
    let imageBlob;
    let fileName;

    // 1. Native mobile flow using Capacitor Camera
    if (isNative()) {
      const permission = await Camera.checkPermissions();
      if (permission.camera !== 'granted' || permission.photos !== 'granted') {
        const req = await Camera.requestPermissions();
        if (req.camera !== 'granted') {
          throw new Error('Camera permission denied.');
        }
      }

      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt // Ask user to take photo or choose from gallery
      });

      if (!image.path && !image.webPath) {
        throw new Error('No image was captured.');
      }

      // Fetch file from the local URI to convert to a Blob
      const response = await fetch(image.webPath || image.path);
      imageBlob = await response.blob();
      fileName = `mobile_${Date.now()}.${image.format || 'jpeg'}`;
    } else {
      // 2. Web fallback (standard file selection dialog)
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      
      const fileSelected = new Promise((resolve) => {
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) resolve(file);
          else resolve(null);
        };
      });
      
      input.click();
      const file = await fileSelected;
      if (!file) return null;
      
      imageBlob = file;
      fileName = `web_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    }

    // 3. Upload to Supabase Storage (ezc_media bucket)
    const filePath = `uploads/${fileName}`;
    onProgress(true); // Start spinner
    
    const { data, error } = await supabase.storage
      .from('ezc_media')
      .upload(filePath, imageBlob, {
        cacheControl: '3600',
        upsert: false
      });

    onProgress(false); // Stop spinner
    if (error) throw error;

    // 4. Retrieve and return public URL
    const { data: { publicUrl } } = supabase.storage
      .from('ezc_media')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (err) {
    onProgress(false);
    console.error('Image capture or upload failed:', err);
    throw err;
  }
};
