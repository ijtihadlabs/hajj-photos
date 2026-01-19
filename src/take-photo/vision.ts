import {
  FaceDetector,
  FilesetResolver,
  type FaceDetectorResult,
} from "@mediapipe/tasks-vision";

let detector: FaceDetector | null = null;

export async function getFaceDetector(): Promise<FaceDetector> {
  if (detector) return detector;

  const fileset = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );

  detector = await FaceDetector.createFromOptions(fileset, {
    baseOptions: {
      // This model is fetched by the library at runtime (client-side).
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
    },
    runningMode: "VIDEO",
  });

  return detector;
}

export type FaceBox = {
  // Normalized [0..1] relative to the displayed video frame.
  x: number;
  y: number;
  w: number;
  h: number;
};

export function getLargestFaceBox(result: FaceDetectorResult | null): FaceBox | null {
  if (!result?.detections?.length) return null;

  // Pick the largest detection by area.
  let best = result.detections[0];
  let bestArea = 0;

  for (const d of result.detections) {
    const bb = d.boundingBox;
    if (!bb) continue;

    const w = bb.width ?? 0;
    const h = bb.height ?? 0;
    const area = w * h;
    if (area > bestArea) {
      bestArea = area;
      best = d;
    }
  }

  const bb = best.boundingBox;
  if (!bb) return null;

  // These are in pixels relative to the input image.
  // We convert later using input width/height.
  return {
    x: bb.originX ?? 0,
    y: bb.originY ?? 0,
    w: bb.width ?? 0,
    h: bb.height ?? 0,
  };
}
