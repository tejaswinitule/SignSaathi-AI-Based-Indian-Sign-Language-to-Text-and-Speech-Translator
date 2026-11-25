import json
import numpy as np
import tensorflow as tf

from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_class_weight
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

BASE_DIR = Path(__file__).resolve().parents[2]
PREPROCESSING_DIR = BASE_DIR / "deep_learning" / "preprocessing"
MODEL_DIR = BASE_DIR / "deep_learning" / "models"
EVALUATION_DIR = BASE_DIR / "deep_learning" / "evaluation"

X_PATH = PREPROCESSING_DIR / "X_isl40.npy"
Y_PATH = PREPROCESSING_DIR / "y_isl40.npy"
LABELS_PATH = PREPROCESSING_DIR / "class_labels_isl40.json"

MODEL_PATH = MODEL_DIR / "bilstm_isl40.keras"
BEST_MODEL_PATH = MODEL_DIR / "bilstm_isl40_best.keras"
METRICS_PATH = EVALUATION_DIR / "training_metrics_isl40.json"
REPORT_PATH = EVALUATION_DIR / "classification_report_isl40.txt"
CONFUSION_PATH = EVALUATION_DIR / "confusion_matrix_isl40.npy"

RANDOM_STATE = 42
EPOCHS = 100
BATCH_SIZE = 16


def main():
    print("\\n======================================")
    print(" SignSaathi ISL-40 BiLSTM Training")
    print("======================================\\n")

    for path in [X_PATH, Y_PATH, LABELS_PATH]:
        if not path.exists():
            raise FileNotFoundError(f"Required file not found: {path}")

    X = np.load(X_PATH).astype(np.float32)
    y = np.load(Y_PATH).astype(np.int32)

    with open(LABELS_PATH, "r", encoding="utf-8") as file:
        class_labels = json.load(file)

    index_to_label = {int(index): label for label, index in class_labels.items()}
    num_classes = len(class_labels)

    print("X shape:", X.shape)
    print("y shape:", y.shape)
    print("Number of classes:", num_classes)
    print("Labels:", list(class_labels.keys()))

    if X.ndim != 3 or X.shape[1:] != (30, 126):
        raise ValueError(f"Expected X shape (samples, 30, 126), received {X.shape}")
    if len(X) != len(y):
        raise ValueError("X and y contain different sample counts.")
    if len(np.unique(y)) != num_classes:
        raise ValueError("Some classes in the labels file are missing from y.")
    if not np.isfinite(X).all():
        raise ValueError("X contains NaN or infinite values.")

    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=0.30, random_state=RANDOM_STATE, stratify=y
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.50, random_state=RANDOM_STATE, stratify=y_temp
    )

    print("\\nData split:")
    print("Training:", X_train.shape, y_train.shape)
    print("Validation:", X_val.shape, y_val.shape)
    print("Testing:", X_test.shape, y_test.shape)

    classes = np.unique(y_train)
    weights = compute_class_weight(class_weight="balanced", classes=classes, y=y_train)
    class_weights = {int(k): float(v) for k, v in zip(classes, weights)}

    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(30, 126)),
        tf.keras.layers.Masking(mask_value=0.0),
        tf.keras.layers.Bidirectional(tf.keras.layers.LSTM(64, return_sequences=True)),
        tf.keras.layers.Dropout(0.35),
        tf.keras.layers.Bidirectional(tf.keras.layers.LSTM(32)),
        tf.keras.layers.Dropout(0.35),
        tf.keras.layers.Dense(64, activation="relu"),
        tf.keras.layers.Dropout(0.30),
        tf.keras.layers.Dense(num_classes, activation="softmax")
    ])

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"]
    )
    model.summary()

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    EVALUATION_DIR.mkdir(parents=True, exist_ok=True)

    callbacks = [
        tf.keras.callbacks.EarlyStopping(
            monitor="val_loss", patience=15, restore_best_weights=True, verbose=1
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss", factor=0.5, patience=5, min_lr=0.00001, verbose=1
        ),
        tf.keras.callbacks.ModelCheckpoint(
            filepath=str(BEST_MODEL_PATH), monitor="val_loss",
            save_best_only=True, verbose=1
        )
    ]

    print("\\nStarting training...\\n")
    history = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        class_weight=class_weights,
        callbacks=callbacks,
        verbose=1
    )

    model.save(MODEL_PATH)

    print("\\nEvaluating on test data...")
    test_loss, test_keras_accuracy = model.evaluate(X_test, y_test, verbose=0)
    probabilities = model.predict(X_test, verbose=0)
    y_pred = np.argmax(probabilities, axis=1)
    test_accuracy = accuracy_score(y_test, y_pred)

    target_names = [index_to_label[i] for i in range(num_classes)]
    report = classification_report(
        y_test, y_pred, labels=list(range(num_classes)),
        target_names=target_names, zero_division=0
    )
    matrix = confusion_matrix(y_test, y_pred, labels=list(range(num_classes)))

    print("\\nClassification Report:\\n")
    print(report)

    REPORT_PATH.write_text(report, encoding="utf-8")
    np.save(CONFUSION_PATH, matrix)

    metrics = {
        "model_name": "BiLSTM ISL-40",
        "dataset": "ISL Isolated 40 Words - selected valid classes",
        "samples": int(len(X)),
        "classes": int(num_classes),
        "input_shape": list(X.shape),
        "train_samples": int(len(X_train)),
        "validation_samples": int(len(X_val)),
        "test_samples": int(len(X_test)),
        "epochs_completed": int(len(history.history["loss"])),
        "best_validation_accuracy": float(max(history.history["val_accuracy"])),
        "test_loss": float(test_loss),
        "test_accuracy": float(test_accuracy),
        "test_keras_accuracy": float(test_keras_accuracy),
        "class_labels": class_labels,
        "model_file": str(MODEL_PATH)
    }
    with open(METRICS_PATH, "w", encoding="utf-8") as file:
        json.dump(metrics, file, indent=4)

    print("\\n======================================")
    print(" TRAINING COMPLETED")
    print("======================================")
    print(f"Test Accuracy: {test_accuracy * 100:.2f}%")
    print(f"Best Validation Accuracy: {metrics['best_validation_accuracy'] * 100:.2f}%")
    print("\\nSaved files:")
    print("bilstm_isl40.keras")
    print("bilstm_isl40_best.keras")
    print("training_metrics_isl40.json")
    print("classification_report_isl40.txt")
    print("confusion_matrix_isl40.npy")
    print("\\nOld model files were not modified.")


if __name__ == "__main__":
    main()
