"""
SignSaathi BiLSTM training script.
Expected inputs in deep_learning/preprocessing:
  X.npy: (samples, frames, features)
  y.npy: integer class IDs
  class_labels.json: {"class name": integer ID}

Run from backend virtual environment:
  python ..\deep_learning\training\train_bilstm.py
"""
import json
import random
from pathlib import Path

import numpy as np
import tensorflow as tf

SEED = 42
random.seed(SEED)
np.random.seed(SEED)
tf.random.set_seed(SEED)

ROOT = Path(__file__).resolve().parents[2]
PREPROCESS_DIR = ROOT / "deep_learning" / "preprocessing"
MODEL_DIR = ROOT / "deep_learning" / "models"
EVAL_DIR = ROOT / "deep_learning" / "evaluation"

X_PATH = PREPROCESS_DIR / "X.npy"
Y_PATH = PREPROCESS_DIR / "y.npy"
LABELS_PATH = PREPROCESS_DIR / "class_labels.json"

EPOCHS = 80
BATCH_SIZE = 8


def stratified_split(y, train_ratio=0.70, val_ratio=0.15):
    train_idx, val_idx, test_idx = [], [], []
    rng = np.random.default_rng(SEED)
    for class_id in np.unique(y):
        indices = np.where(y == class_id)[0]
        rng.shuffle(indices)
        n = len(indices)
        if n < 3:
            raise ValueError(
                f"Class ID {class_id} has only {n} sample(s); "
                "at least 3 are needed for train/validation/test."
            )
        n_train = max(1, int(n * train_ratio))
        n_val = max(1, int(n * val_ratio))
        if n_train + n_val >= n:
            n_train = n - 2
            n_val = 1
        train_idx.extend(indices[:n_train])
        val_idx.extend(indices[n_train:n_train + n_val])
        test_idx.extend(indices[n_train + n_val:])

    rng.shuffle(train_idx)
    rng.shuffle(val_idx)
    rng.shuffle(test_idx)
    return (
        np.asarray(train_idx, dtype=np.int64),
        np.asarray(val_idx, dtype=np.int64),
        np.asarray(test_idx, dtype=np.int64),
    )


def main():
    for path in (X_PATH, Y_PATH, LABELS_PATH):
        if not path.exists():
            raise FileNotFoundError(f"Required file not found: {path}")

    print("Loading landmark dataset...")
    X = np.load(X_PATH).astype(np.float32)
    y = np.load(Y_PATH).astype(np.int64)

    with open(LABELS_PATH, "r", encoding="utf-8") as f:
        label_map = json.load(f)

    if X.ndim != 3:
        raise ValueError(f"Expected X to have 3 dimensions, got shape {X.shape}")
    if len(X) != len(y):
        raise ValueError(f"X/y sample count mismatch: {len(X)} vs {len(y)}")
    if len(np.unique(y)) < 2:
        raise ValueError("Training requires at least two different gesture classes.")
    if not np.isfinite(X).all():
        raise ValueError("X.npy contains NaN or infinite values.")

    id_to_label = {int(value): key for key, value in label_map.items()}
    class_ids = sorted(int(v) for v in np.unique(y))
    missing_ids = [class_id for class_id in class_ids if class_id not in id_to_label]
    if missing_ids:
        raise ValueError(f"class_labels.json is missing IDs: {missing_ids}")

    # Remove videos where no hand landmarks were detected in any sampled frame.
    valid_mask = np.any(np.abs(X) > 1e-8, axis=(1, 2))
    removed = int((~valid_mask).sum())
    if removed:
        print(f"Removing {removed} sample(s) with no detected hand landmarks.")
        X, y = X[valid_mask], y[valid_mask]

    if len(X) < 20:
        raise ValueError(
            f"Only {len(X)} usable samples remain. Check landmark extraction before training."
        )

    print(f"Samples: {len(X)}")
    print(f"Input shape: {X.shape}")
    print("Gesture classes:")
    for class_id in class_ids:
        count = int(np.sum(y == class_id))
        print(f"  {id_to_label[class_id]}: {count}")

    train_idx, val_idx, test_idx = stratified_split(y)
    X_train, y_train = X[train_idx], y[train_idx]
    X_val, y_val = X[val_idx], y[val_idx]
    X_test, y_test = X[test_idx], y[test_idx]

    print(f"\nSplit sizes - train: {len(train_idx)}, validation: {len(val_idx)}, test: {len(test_idx)}")

    # Landmark coordinates are already normalized by MediaPipe.
    inputs = tf.keras.Input(shape=(X.shape[1], X.shape[2]), name="landmark_sequence")
    x = tf.keras.layers.Masking(mask_value=0.0)(inputs)
    x = tf.keras.layers.Bidirectional(
        tf.keras.layers.LSTM(64, return_sequences=True)
    )(x)
    x = tf.keras.layers.Dropout(0.35)(x)
    x = tf.keras.layers.Bidirectional(tf.keras.layers.LSTM(32))(x)
    x = tf.keras.layers.Dropout(0.35)(x)
    x = tf.keras.layers.Dense(64, activation="relu")(x)
    x = tf.keras.layers.Dropout(0.25)(x)
    outputs = tf.keras.layers.Dense(len(class_ids), activation="softmax", name="gesture")(x)

    model = tf.keras.Model(inputs=inputs, outputs=outputs, name="SignSaathi_BiLSTM")
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    model.summary()

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    EVAL_DIR.mkdir(parents=True, exist_ok=True)
    model_path = MODEL_DIR / "bilstm.keras"

    callbacks = [
        tf.keras.callbacks.ModelCheckpoint(
            filepath=str(model_path),
            monitor="val_accuracy",
            save_best_only=True,
            mode="max",
            verbose=1,
        ),
        tf.keras.callbacks.EarlyStopping(
            monitor="val_loss",
            patience=12,
            restore_best_weights=True,
            verbose=1,
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=5,
            min_lr=1e-6,
            verbose=1,
        ),
    ]

    print("\nStarting BiLSTM training...")
    history = model.fit(
        X_train,
        y_train,
        validation_data=(X_val, y_val),
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        callbacks=callbacks,
        verbose=1,
    )

    # Load the best checkpoint before test evaluation.
    best_model = tf.keras.models.load_model(model_path)
    test_loss, test_accuracy = best_model.evaluate(X_test, y_test, verbose=0)
    probabilities = best_model.predict(X_test, verbose=0)
    predictions = np.argmax(probabilities, axis=1)

    report = {
        "test_samples": int(len(y_test)),
        "test_loss": float(test_loss),
        "test_accuracy": float(test_accuracy),
        "classes": {},
        "warning": (
            "Small 9-class subset evaluation. Results are preliminary and do not "
            "represent recognition of all Indian Sign Language."
        ),
    }

    for class_id in class_ids:
        true_positive = int(np.sum((y_test == class_id) & (predictions == class_id)))
        false_positive = int(np.sum((y_test != class_id) & (predictions == class_id)))
        false_negative = int(np.sum((y_test == class_id) & (predictions != class_id)))
        precision = true_positive / (true_positive + false_positive) if true_positive + false_positive else 0.0
        recall = true_positive / (true_positive + false_negative) if true_positive + false_negative else 0.0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
        report["classes"][id_to_label[class_id]] = {
            "precision": precision,
            "recall": recall,
            "f1_score": f1,
            "test_support": int(np.sum(y_test == class_id)),
        }

    report_path = EVAL_DIR / "training_metrics.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    # Save the exact label mapping used by the trained model.
    with open(MODEL_DIR / "class_labels.json", "w", encoding="utf-8") as f:
        json.dump(label_map, f, ensure_ascii=False, indent=2)

    np.save(EVAL_DIR / "training_history_loss.npy", np.asarray(history.history["loss"]))
    np.save(EVAL_DIR / "training_history_accuracy.npy", np.asarray(history.history["accuracy"]))

    print("\nTRAINING COMPLETE")
    print(f"Best model: {model_path}")
    print(f"Labels: {MODEL_DIR / 'class_labels.json'}")
    print(f"Test accuracy: {test_accuracy:.4f} ({test_accuracy * 100:.2f}%)")
    print(f"Metrics report: {report_path}")
    print("Note: This is a preliminary model trained on the 9 available gesture classes.")


if __name__ == "__main__":
    main()
