import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

export const loadFaceModels = async () => {
  if (modelsLoaded) return;
  
  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      // Check if already loaded in this instance (backup check)
      if (
        faceapi.nets.tinyFaceDetector.isLoaded &&
        faceapi.nets.faceLandmark68Net.isLoaded &&
        faceapi.nets.faceRecognitionNet.isLoaded
      ) {
        modelsLoaded = true;
        return;
      }

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/facemodels'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/facemodels'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/facemodels')
      ]);
      
      modelsLoaded = true;
      console.log('Face-API models loaded successfully');
    } catch (err) {
      console.error("Failed to load Face API models", err);
      loadingPromise = null; // Allow retry on failure
      throw err;
    }
  })();

  return loadingPromise;
};

export const isModelsLoaded = () => modelsLoaded;
