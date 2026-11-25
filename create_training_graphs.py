import numpy as np
import matplotlib.pyplot as plt
import json
import os

BASE = os.path.dirname(os.path.abspath(__file__))
EVAL = os.path.join(BASE, "deep_learning", "evaluation")
PRE = os.path.join(BASE, "deep_learning", "preprocessing")

# Load actual training data
accuracy = np.load(os.path.join(EVAL, "training_history_accuracy.npy"))
loss = np.load(os.path.join(EVAL, "training_history_loss.npy"))

epochs = range(1, len(accuracy) + 1)

# 1. Training Accuracy Graph
plt.figure(figsize=(9, 5))
plt.plot(epochs, accuracy, label="Training Accuracy")
plt.title("Training Accuracy")
plt.xlabel("Epochs")
plt.ylabel("Accuracy")
plt.grid(True)
plt.legend()
plt.tight_layout()
plt.savefig(os.path.join(EVAL, "training_accuracy_graph.png"), dpi=300)
plt.close()

# 2. Training Loss Graph
plt.figure(figsize=(9, 5))
plt.plot(epochs, loss, label="Training Loss")
plt.title("Training Loss")
plt.xlabel("Epochs")
plt.ylabel("Loss")
plt.grid(True)
plt.legend()
plt.tight_layout()
plt.savefig(os.path.join(EVAL, "training_loss_graph.png"), dpi=300)
plt.close()

# 3. Confusion Matrix
cm = np.load(os.path.join(EVAL, "confusion_matrix_isl40.npy"))

with open(os.path.join(PRE, "class_labels_isl40.json")) as f:
    labels = json.load(f)

if isinstance(labels, dict):
    labels = [labels[k] for k in sorted(labels, key=lambda x: int(x))]

plt.figure(figsize=(14, 12))
plt.imshow(cm, cmap="Blues", interpolation="nearest")
plt.title("Confusion Matrix - ISL 28 Classes")
plt.xlabel("Predicted Class")
plt.ylabel("Actual Class")
plt.xticks(range(len(labels)), labels, rotation=90, fontsize=7)
plt.yticks(range(len(labels)), labels, fontsize=7)
plt.colorbar()
plt.tight_layout()
plt.savefig(os.path.join(EVAL, "confusion_matrix_graph.png"), dpi=300)
plt.close()

print("Three graph images created successfully!")
print("Accuracy graph:", len(accuracy), "epochs")
print("Loss graph:", len(loss), "epochs")
print("Confusion matrix:", cm.shape)