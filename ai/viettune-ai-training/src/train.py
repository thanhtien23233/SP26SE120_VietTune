"""
train.py — Training loop chính.

Flow:
  1. Load embeddings + labels (từ file .npy đã extract ở bước trước)
  2. Chia train/test (80/20, stratified)
  3. Xây dựng classifier model
  4. Train với callbacks (early stopping, checkpoint, LR scheduler)
  5. Đánh giá trên test set (accuracy, precision, recall, confusion matrix)
  6. Vẽ biểu đồ training history

Công nghệ:
  - scikit-learn: chia train/test, classification_report, confusion_matrix
  - matplotlib: vẽ biểu đồ loss/accuracy
  - tf.keras: training loop (.fit())
"""

import numpy as np
import os
os.environ["TF_USE_LEGACY_KERAS"] = "1"
import matplotlib
matplotlib.use("Agg")  # Backend không cần GUI (chạy trên server/Colab OK)
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import (
    EMBEDDINGS_FILE, LABELS_FILE, CLASS_NAMES_FILE, TEST_SIZE, RANDOM_SEED,
    BATCH_SIZE, EPOCHS, TRAINING_HISTORY_PLOT, EARLY_STOPPING_PATIENCE
)
from build_model import build_classifier, get_callbacks


def load_processed_data() -> tuple:
    """
    Load embeddings và labels đã extract ở bước trước.

    Nếu file chưa tồn tại → hướng dẫn chạy extract_embeddings.py trước.

    Returns:
        (X, y)
        X: numpy (num_samples, 1024)
        y: numpy (num_samples,) — giá trị 0 hoặc 1
    """
    if not os.path.exists(EMBEDDINGS_FILE) or not os.path.exists(LABELS_FILE) or not os.path.exists(CLASS_NAMES_FILE):
        print("❌ Chưa có processed data hoặc class_names.txt!")
        print("   Chạy trước: python src/extract_embeddings.py")
        sys.exit(1)

    print("Đang load processed data...")
    X = np.load(EMBEDDINGS_FILE)
    y = np.load(LABELS_FILE)
    
    with open(CLASS_NAMES_FILE, "r", encoding="utf-8") as f:
        class_names = [line.strip() for line in f if line.strip()]

    print(f"  Embeddings: {X.shape}")
    print(f"  Labels:     {y.shape}")
    for idx, name in enumerate(class_names):
        print(f"  {name}: {np.sum(y == idx):,} samples")
    return X, y, class_names


def split_data(X, y) -> tuple:
    """
    Chia data thành train set và test set.

    stratify=y: đảm bảo tỉ lệ positive/negative giống nhau
    ở cả 2 set. Tránh trường hợp test set toàn negative.

    Returns:
        (X_train, X_test, y_train, y_test)
    """
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=TEST_SIZE,
        random_state=RANDOM_SEED,
        stratify=y,
    )
    print(f"\nChia data:")
    print(f"  Train: {X_train.shape[0]:,} samples")
    print(f"  Test:  {X_test.shape[0]:,} samples")
    return X_train, X_test, y_train, y_test


def plot_history(history):
    """
    Vẽ biểu đồ training history (loss + accuracy).

    Biểu đồ giúp phát hiện:
    - Overfit: train acc cao, val acc thấp (khoảng cách lớn)
    - Underfit: cả 2 đều thấp
    - Good fit: cả 2 đều cao, gần nhau
    """
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    axes[0].plot(history.history["loss"], label="Train Loss", linewidth=2)
    axes[0].plot(history.history["val_loss"], label="Val Loss", linewidth=2)
    axes[0].set_title("Loss", fontsize=14)
    axes[0].set_xlabel("Epoch")
    axes[0].set_ylabel("Loss")
    axes[0].legend()
    axes[0].grid(True, alpha=0.3)

    axes[1].plot(history.history["accuracy"], label="Train Acc", linewidth=2)
    axes[1].plot(history.history["val_accuracy"], label="Val Acc", linewidth=2)
    axes[1].set_title("Accuracy", fontsize=14)
    axes[1].set_xlabel("Epoch")
    axes[1].set_ylabel("Accuracy")
    axes[1].legend()
    axes[1].grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig(TRAINING_HISTORY_PLOT, dpi=150)
    print(f"\n📊 Biểu đồ → {TRAINING_HISTORY_PLOT}")


def evaluate(model, X_test, y_test, class_names):
    """
    Đánh giá model trên test set.
    """
    y_pred_prob = model.predict(X_test, verbose=0)
    y_pred = np.argmax(y_pred_prob, axis=1)

    print(f"\n{'=' * 60}")
    print("ĐÁNH GIÁ TRÊN TEST SET")
    print(classification_report(y_test, y_pred, target_names=class_names, labels=np.arange(len(class_names)), zero_division=0))

    cm = confusion_matrix(y_test, y_pred, labels=np.arange(len(class_names)))
    print("Confusion Matrix:")
    
    # Print header
    header = "          " + " ".join([f"{name[:6]:<8}" for name in class_names])
    print(header)
    
    for i, name in enumerate(class_names):
        row = f"{name[:8]:<9} " + " ".join([f"{val:<8}" for val in cm[i]])
        print(row)

    print("\nPer-Class Accuracy:")
    for i, name in enumerate(class_names):
        mask = (y_test == i)
        if np.sum(mask) > 0:
            acc = np.mean(y_pred[mask] == i)
            print(f"  {name}: {acc:.4f}")

    eval_result = model.evaluate(X_test, y_test, verbose=0)
    if isinstance(eval_result, list):
        loss, acc = eval_result[0], eval_result[1]
    else:
        loss, acc = eval_result, 0.0 # fallback

    print(f"\n  Test Accuracy:  {acc:.4f} ({acc*100:.1f}%)")
    print(f"  Test Loss:      {loss:.4f}")


def main():
    """Main training flow."""
    # 1. Load data
    X, y, class_names = load_processed_data()

    # 2. Chia train/test
    X_train, X_test, y_train, y_test = split_data(X, y)

    # 3. Build model
    print("\n🏗️ Xây dựng model...")
    model = build_classifier()

    # 4. Train
    print(f"\n🚀 Bắt đầu training...")
    print(f"   Batch size:  {BATCH_SIZE}")
    print(f"   Max epochs:  {EPOCHS}")
    print(f"   Early stop:  {EARLY_STOPPING_PATIENCE} epochs patience")
    print()

    history = model.fit(
        X_train, y_train,
        validation_split=0.15,
        batch_size=BATCH_SIZE,
        epochs=EPOCHS,
        callbacks=get_callbacks(),
        verbose=1,
    )

    # 5. Vẽ biểu đồ
    plot_history(history)

    # 6. Đánh giá
    evaluate(model, X_test, y_test, class_names)

    print(f"\n✅ Training hoàn tất!")
    print(f"   Model tốt nhất: {os.path.basename(EMBEDDINGS_FILE)}")
    print(f"   Tiếp theo chạy: python src/export_onnx.py")


if __name__ == "__main__":
    main()
