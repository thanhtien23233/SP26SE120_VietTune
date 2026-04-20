"""
build_model.py — Xây dựng classifier model.

Kiến trúc: Input(1024) → Dense(256) → Dropout → Dense(128) → Dropout → Output(1)

Tại sao đơn giản?
  - YAMNet embeddings ĐÃ CHỨA thông tin phong phú (1024 features)
  - Classifier chỉ cần học: "tổ hợp features nào = đàn bầu?"
  - Model đơn giản ít bị overfit khi data ít
  - Tổng chỉ ~295K params (~1.2MB) — deploy rất nhẹ

Công nghệ:
  - tf.keras.Sequential: API đơn giản nhất của TensorFlow để stack layers
  - Dense layer: fully connected layer (mỗi neuron nối tất cả input)
  - Dropout: tắt ngẫu nhiên N% neurons mỗi batch → chống overfit
  - Sigmoid output: xác suất [0.0, 1.0] → binary classification
"""

import os
os.environ["TF_USE_LEGACY_KERAS"] = "1"
import tensorflow as tf
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import EMBEDDING_DIM, LEARNING_RATE, BEST_MODEL_PATH, EARLY_STOPPING_PATIENCE, NUM_CLASSES


def build_classifier() -> tf.keras.Model:
    """
    Tạo và compile classifier model.

    Kiến trúc:
    ┌────────────────────────────────────────────────────┐
    │ Layer              │ Output Shape │ Params          │
    │────────────────────│──────────────│─────────────────│
    │ embedding_input    │ (None, 1024) │ 0               │
    │ hidden_1 (Dense)   │ (None, 256)  │ 262,400         │
    │ dropout_1          │ (None, 256)  │ 0               │
    │ hidden_2 (Dense)   │ (None, 128)  │ 32,896          │
    │ dropout_2          │ (None, 128)  │ 0               │
    │ output (Dense)     │ (None, 1)    │ 129             │
    │────────────────────│──────────────│─────────────────│
    │ TOTAL              │              │ 295,425         │
    └────────────────────────────────────────────────────┘

    Returns:
        tf.keras.Model đã compile, sẵn sàng .fit()
    """
    model = tf.keras.Sequential([
        # Input: nhận embedding 1024 chiều từ YAMNet
        tf.keras.layers.Input(shape=(EMBEDDING_DIM,), name="embedding_input"),

        # Hidden layer 1: 1024 → 256
        # ReLU activation: f(x) = max(0, x) — đơn giản, hiệu quả
        tf.keras.layers.Dense(256, activation="relu", name="hidden_1"),

        # Dropout 30%: mỗi batch, tắt ngẫu nhiên 30% neurons
        # Buộc model không phụ thuộc vào neuron cụ thể → chống overfit
        tf.keras.layers.Dropout(0.3, name="dropout_1"),

        # Hidden layer 2: 256 → 128
        tf.keras.layers.Dense(128, activation="relu", name="hidden_2"),
        tf.keras.layers.Dropout(0.3, name="dropout_2"),

        # Output: NUM_CLASSES neurons + softmax
        tf.keras.layers.Dense(NUM_CLASSES, activation="softmax", name="output"),
    ])

    model.compile(
        # Multiclass crossentropy
        loss="sparse_categorical_crossentropy",

        # Adam: optimizer phổ biến nhất, tự điều chỉnh LR mỗi param
        optimizer=tf.keras.optimizers.Adam(learning_rate=LEARNING_RATE),

        # Metrics: theo dõi trong quá trình train
        metrics=[
            "accuracy",
        ],
    )

    model.summary()
    return model


def get_callbacks() -> list:
    """
    Tạo training callbacks — hành động tự động sau mỗi epoch.

    Callbacks:
    1. EarlyStopping: dừng nếu val_loss không giảm 5 epoch liên tiếp
    2. ModelCheckpoint: lưu model tốt nhất (val_accuracy cao nhất)
    3. ReduceLROnPlateau: giảm learning rate khi val_loss bão hòa

    Returns:
        list callback objects
    """
    return [
        # Dừng sớm nếu không cải thiện
        tf.keras.callbacks.EarlyStopping(
            monitor="val_loss",
            patience=EARLY_STOPPING_PATIENCE,
            restore_best_weights=True,
            verbose=1,
        ),

        # Lưu model tốt nhất
        tf.keras.callbacks.ModelCheckpoint(
            filepath=BEST_MODEL_PATH,
            monitor="val_accuracy",
            save_best_only=True,
            verbose=1,
        ),

        # Giảm LR khi bão hòa
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,         # LR mới = LR cũ × 0.5
            patience=3,
            min_lr=1e-6,
            verbose=1,
        ),
    ]


if __name__ == "__main__":
    model = build_classifier()
    print("\n✅ Model xây dựng thành công!")
