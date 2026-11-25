
import cv2
import json
import numpy as np
import mediapipe as mp

from pathlib import Path
from collections import Counter
from mediapipe.tasks import python
from mediapipe.tasks.python import vision


# ==========================================
# PROJECT PATHS
# ==========================================

BASE_DIR = Path(__file__).resolve().parents[2]

DATASET_DIR = (
    BASE_DIR / "deep_learning" / "dataset" / "isl_isolated_40words"
)

PREPROCESSING_DIR = (
    BASE_DIR / "deep_learning" / "preprocessing"
)

MODEL_PATH = PREPROCESSING_DIR / "hand_landmarker.task"


# ==========================================
# CONFIGURATION
# ==========================================

NUM_FRAMES = 30
NUM_HANDS = 2
LANDMARKS_PER_HAND = 21
FEATURES_PER_FRAME = NUM_HANDS * LANDMARKS_PER_HAND * 3

# Ignore classes with fewer than 10 valid videos
MIN_SAMPLES_PER_CLASS = 10


# ==========================================
# DOWNLOAD MEDIAPIPE MODEL IF MISSING
# ==========================================

def ensure_mediapipe_model():

    if MODEL_PATH.exists():
        print("MediaPipe model already exists.")
        return

    import urllib.request

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)

    url = (
        "https://storage.googleapis.com/"
        "mediapipe-models/hand_landmarker/"
        "hand_landmarker/float16/1/"
        "hand_landmarker.task"
    )

    print("Downloading MediaPipe hand model...")

    urllib.request.urlretrieve(url, MODEL_PATH)

    print("Model downloaded successfully.")


# ==========================================
# CREATE MEDIAPIPE HAND LANDMARKER
# ==========================================

def create_landmarker():

    base_options = python.BaseOptions(
        model_asset_path=str(MODEL_PATH)
    )

    options = vision.HandLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.IMAGE,
        num_hands=NUM_HANDS,
        min_hand_detection_confidence=0.5,
        min_hand_presence_confidence=0.5,
        min_tracking_confidence=0.5
    )

    return vision.HandLandmarker.create_from_options(options)


# ==========================================
# EXTRACT LANDMARKS FROM ONE FRAME
# ==========================================

def extract_frame_landmarks(frame, landmarker):

    frame_features = np.zeros(
        FEATURES_PER_FRAME,
        dtype=np.float32
    )

    rgb_frame = cv2.cvtColor(
        frame,
        cv2.COLOR_BGR2RGB
    )

    mp_image = mp.Image(
        image_format=mp.ImageFormat.SRGB,
        data=rgb_frame
    )

    result = landmarker.detect(mp_image)

    if not result.hand_landmarks:
        return frame_features

    for hand_index, hand_points in enumerate(result.hand_landmarks):

        handedness = result.handedness[hand_index]

        label = handedness[0].category_name.lower()

        if label == "left":
            hand_slot = 0

        elif label == "right":
            hand_slot = 1

        else:
            continue

        start = hand_slot * LANDMARKS_PER_HAND * 3

        for point_index, point in enumerate(hand_points):

            offset = start + point_index * 3

            frame_features[offset] = point.x
            frame_features[offset + 1] = point.y
            frame_features[offset + 2] = point.z

    return frame_features


# ==========================================
# PROCESS ONE VIDEO
# ==========================================

def process_video(video_path, landmarker):

    cap = cv2.VideoCapture(str(video_path))

    if not cap.isOpened():
        print("Cannot open:", video_path.name)
        return None

    total_frames = int(
        cap.get(cv2.CAP_PROP_FRAME_COUNT)
    )

    if total_frames <= 0:
        cap.release()
        return None

    frame_indices = np.linspace(
        0,
        total_frames - 1,
        NUM_FRAMES,
        dtype=int
    )

    sequence = []

    for frame_index in frame_indices:

        cap.set(cv2.CAP_PROP_POS_FRAMES, int(frame_index))

        success, frame = cap.read()

        if not success:
            sequence.append(
                np.zeros(FEATURES_PER_FRAME, dtype=np.float32)
            )
            continue

        features = extract_frame_landmarks(
            frame,
            landmarker
        )

        sequence.append(features)

    cap.release()

    sequence = np.asarray(
        sequence,
        dtype=np.float32
    )

    if sequence.shape != (NUM_FRAMES, FEATURES_PER_FRAME):
        return None

    return sequence


# ==========================================
# READ JSON METADATA
# ==========================================

def is_valid_video(video_path):

    json_path = video_path.with_suffix(".json")

    if not json_path.exists():
        return False

    try:

        with open(json_path, "r", encoding="utf-8") as file:
            metadata = json.load(file)

        if metadata.get("review_status") != "accepted":
            return False

        if metadata.get("duplicate_status") != "unique":
            return False

        return True

    except Exception as error:

        print("Metadata error:", json_path.name, error)
        return False


# ==========================================
# MAIN PREPROCESSING
# ==========================================

def main():

    print("\n===================================")
    print("   SignSaathi ISL-40 Preprocessing")
    print("===================================\n")

    if not DATASET_DIR.exists():

        print("Dataset folder not found:", DATASET_DIR)
        return

    ensure_mediapipe_model()

    all_videos = list(
        DATASET_DIR.rglob("*.mp4")
    )

    print("Total MP4 videos found:", len(all_videos))

    valid_videos = []

    class_counts = Counter()

    for video in all_videos:

        if is_valid_video(video):

            label = video.parent.name.lower()

            class_counts[label] += 1

            valid_videos.append(video)

    print("Valid videos:", len(valid_videos))

    selected_classes = sorted([
        label
        for label, count in class_counts.items()
        if count >= MIN_SAMPLES_PER_CLASS
    ])

    print(
        "\nClasses selected:",
        len(selected_classes)
    )

    print("\nSelected classes:")

    for label in selected_classes:
        print(
            f"{label}: {class_counts[label]} videos"
        )

    selected_videos = [
        video
        for video in valid_videos
        if video.parent.name.lower() in selected_classes
    ]

    if not selected_videos:

        print("\nNo eligible videos found.")
        return

    class_labels = {
        label: index
        for index, label in enumerate(selected_classes)
    }

    X = []
    y = []

    landmarker = create_landmarker()

    try:

        total = len(selected_videos)

        for index, video_path in enumerate(selected_videos, start=1):

            label = video_path.parent.name.lower()

            print(
                f"[{index}/{total}] "
                f"Processing: {label} / {video_path.name}"
            )

            sequence = process_video(
                video_path,
                landmarker
            )

            if sequence is None:
                print("Skipped:", video_path.name)
                continue

            X.append(sequence)
            y.append(class_labels[label])

    finally:

        landmarker.close()

    if not X:

        print("No videos were successfully processed.")
        return

    X = np.asarray(X, dtype=np.float32)
    y = np.asarray(y, dtype=np.int32)

    # ======================================
    # SAVE DATASET
    # ======================================

    PREPROCESSING_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    np.save(
        PREPROCESSING_DIR / "X_isl40.npy",
        X
    )

    np.save(
        PREPROCESSING_DIR / "y_isl40.npy",
        y
    )

    with open(
        PREPROCESSING_DIR / "class_labels_isl40.json",
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            class_labels,
            file,
            indent=4
        )

    summary = {
        "total_videos_found": len(all_videos),
        "valid_videos": len(valid_videos),
        "processed_videos": len(X),
        "selected_classes": len(class_labels),
        "frames_per_video": NUM_FRAMES,
        "features_per_frame": FEATURES_PER_FRAME,
        "input_shape": list(X.shape),
        "class_distribution": {
            label: int(np.sum(y == class_labels[label]))
            for label in class_labels
        }
    }

    with open(
        PREPROCESSING_DIR / "dataset_summary_isl40.json",
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            summary,
            file,
            indent=4
        )

    # ======================================
    # FINAL REPORT
    # ======================================

    print("\n===================================")
    print("PREPROCESSING COMPLETED")
    print("===================================")

    print("X shape:", X.shape)
    print("Y shape:", y.shape)
    print("Number of classes:", len(class_labels))
    print("Processed videos:", len(X))

    print("\nSaved files:")

    print("X_isl40.npy")
    print("y_isl40.npy")
    print("class_labels_isl40.json")
    print("dataset_summary_isl40.json")

    print("\nPreprocessing finished successfully.")


if __name__ == "__main__":
    main()
