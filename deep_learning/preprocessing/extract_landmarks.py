import json
import urllib.request
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATASET_DIR = PROJECT_ROOT / "deep_learning" / "dataset"
OUTPUT_DIR = PROJECT_ROOT / "deep_learning" / "preprocessing"
MODEL_PATH = OUTPUT_DIR / "hand_landmarker.task"
MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
NUM_FRAMES = 30
FEATURES_PER_FRAME = 126


def ensure_model():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if not MODEL_PATH.exists():
        print("Downloading MediaPipe Hand Landmarker model...")
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
        print("Downloaded:", MODEL_PATH)


def class_name(folder):
    return folder.split(".", 1)[1].strip() if "." in folder else folder.strip()


def extract_video(path, landmarker):
    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        print("[SKIP] Cannot open:", path)
        return None
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total <= 0:
        cap.release()
        print("[SKIP] Empty video:", path)
        return None

    indices = np.linspace(0, total - 1, NUM_FRAMES, dtype=int)
    seq = np.zeros((NUM_FRAMES, FEATURES_PER_FRAME), dtype=np.float32)

    for i, frame_no in enumerate(indices):
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(frame_no))
        ok, frame = cap.read()
        if not ok:
            continue
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = landmarker.detect(image)
        if result.hand_landmarks and result.handedness:
            for landmarks, handedness in zip(result.hand_landmarks, result.handedness):
                side = handedness[0].category_name.lower()
                slot = 0 if side == "left" else 1
                vals = []
                for point in landmarks:
                    vals.extend([point.x, point.y, point.z])
                seq[i, slot * 63:(slot + 1) * 63] = np.asarray(vals, dtype=np.float32)
    cap.release()
    return seq


def main():
    if not DATASET_DIR.exists():
        raise FileNotFoundError(f"Dataset folder not found: {DATASET_DIR}")
    ensure_model()

    options = mp.tasks.vision.HandLandmarkerOptions(
        base_options=mp.tasks.BaseOptions(model_asset_path=str(MODEL_PATH)),
        running_mode=mp.tasks.vision.RunningMode.IMAGE,
        num_hands=2,
        min_hand_detection_confidence=0.5,
        min_hand_presence_confidence=0.5,
    )

    videos = sorted(p for p in DATASET_DIR.rglob("*")
                    if p.is_file() and p.suffix.lower() in {".mov", ".mp4", ".avi"})
    print("Videos found:", len(videos))
    if not videos:
        raise RuntimeError("No video files found in dataset.")

    sequences, labels = [], []
    with mp.tasks.vision.HandLandmarker.create_from_options(options) as landmarker:
        for n, path in enumerate(videos, 1):
            label = class_name(path.parent.name)
            sequence = extract_video(path, landmarker)
            if sequence is not None:
                sequences.append(sequence)
                labels.append(label)
            print(f"[{n}/{len(videos)}] {label}: {path.name}")

    if not sequences:
        raise RuntimeError("No videos could be processed.")

    class_names = sorted(set(labels))
    label_map = {name: i for i, name in enumerate(class_names)}
    X = np.stack(sequences).astype(np.float32)
    y = np.asarray([label_map[name] for name in labels], dtype=np.int64)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    np.save(OUTPUT_DIR / "X.npy", X)
    np.save(OUTPUT_DIR / "y.npy", y)
    with open(OUTPUT_DIR / "class_labels.json", "w", encoding="utf-8") as f:
        json.dump(label_map, f, ensure_ascii=False, indent=2)

    print("\nPREPROCESSING COMPLETE")
    print("Samples:", len(X))
    print("Classes:", len(class_names))
    print("X shape:", X.shape)
    print("Saved to:", OUTPUT_DIR)


if __name__ == "__main__":
    main()
