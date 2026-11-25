
import json
import threading
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent

MODEL_PATH = ROOT / "deep_learning" / "models" / "bilstm_isl40_best.keras"
LABELS_PATH = ROOT / "deep_learning" / "preprocessing" / "class_labels_isl40.json"

_model = None
_labels = None
_model_lock = threading.Lock()

MODEL_NAME = "BiLSTM ISL-40"


def model_status():
    ready = MODEL_PATH.is_file() and LABELS_PATH.is_file()

    return {
        "available": ready,
        "model_name": MODEL_NAME,
        "classes": 28,
        "message": (
            "ISL-40 trained model ready."
            if ready else
            "ISL-40 model or class labels are missing."
        )
    }


def _load_model():
    global _model, _labels

    if _model is not None and _labels is not None:
        return _model, _labels

    with _model_lock:
        if _model is None or _labels is None:

            if not MODEL_PATH.is_file():
                raise FileNotFoundError(f"Model not found: {MODEL_PATH}")

            if not LABELS_PATH.is_file():
                raise FileNotFoundError(f"Labels not found: {LABELS_PATH}")

            import tensorflow as tf

            loaded_model = tf.keras.models.load_model(
                MODEL_PATH,
                compile=False
            )

            with LABELS_PATH.open("r", encoding="utf-8") as file:
                raw_labels = json.load(file)

            # Support both label formats:
            # {"drink": 0, "eat": 1}
            # {"0": "drink", "1": "eat"}
            # Also support a list of labels.
            if isinstance(raw_labels, list):
                labels = {
                    i: str(name)
                    for i, name in enumerate(raw_labels)
                }

            elif isinstance(raw_labels, dict):
                labels = {}

                for key, value in raw_labels.items():
                    try:
                        index = int(value)
                        name = str(key)
                    except (ValueError, TypeError):
                        try:
                            index = int(key)
                            name = str(value)
                        except (ValueError, TypeError):
                            raise ValueError(
                                f"Invalid class label entry: {key}: {value}"
                            )

                    labels[index] = name

            else:
                raise ValueError("Unsupported class label JSON format.")

            output_classes = loaded_model.output_shape[-1]

            if len(labels) != output_classes:
                raise ValueError(
                    f"Model has {output_classes} outputs but "
                    f"{len(labels)} labels were loaded."
                )

            if set(labels.keys()) != set(range(output_classes)):
                raise ValueError("Class label indexes are incomplete.")

            _model = loaded_model
            _labels = labels

    return _model, _labels


def predict_sequence(sequence):
    values = np.asarray(sequence, dtype=np.float32)

    if values.shape != (30, 126):
        raise ValueError(
            f"Expected sequence shape (30, 126); received {values.shape}."
        )

    if not np.isfinite(values).all():
        raise ValueError("Sequence contains invalid numeric values.")

    if not np.any(np.abs(values) > 0):
        raise ValueError(
            "No hand landmarks detected. Keep your hand visible and try again."
        )

    model, labels = _load_model()

    probabilities = model.predict(
        values[np.newaxis, ...],
        verbose=0
    )[0]

    predicted_index = int(np.argmax(probabilities))
    confidence = float(probabilities[predicted_index])

    recognized_text = labels.get(predicted_index)

    if recognized_text is None:
        raise ValueError("Predicted class label is missing.")

    return {
        "recognized_text": recognized_text.replace("_", " ").title(),
        "confidence": round(confidence, 4),
        "model_name": MODEL_NAME,
        "class_index": predicted_index
    }
