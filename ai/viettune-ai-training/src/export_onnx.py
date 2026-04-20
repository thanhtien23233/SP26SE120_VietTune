"""
export_onnx.py — Convert trained Keras model → ONNX format.

ONNX (Open Neural Network Exchange):
  - Format model chung, hỗ trợ bởi nhiều runtime khác nhau
  - C# sử dụng qua NuGet package: Microsoft.ML.OnnxRuntime
  - File .onnx chứa cả kiến trúc + weights → 1 file duy nhất

Flow:
  1. Load model Keras (.keras) đã train
  2. Convert sang ONNX bằng tf2onnx
  3. Lưu file .onnx
  4. Verify: so sánh output Keras vs ONNX (phải khớp nhau)

Sau bước này, copy file .onnx vào project .NET là xong.

Công nghệ:
  - tf2onnx: library chính thức convert TF/Keras → ONNX
  - onnxruntime: Microsoft's runtime, dùng để verify model
  - onnx: library đọc/ghi file ONNX
"""

import numpy as np
import os
os.environ["TF_USE_LEGACY_KERAS"] = "1"
import tensorflow as tf
import tf2onnx
import onnx
import onnxruntime as ort
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import BEST_MODEL_PATH, ONNX_MODEL_PATH, EMBEDDING_DIM, NUM_CLASSES, CLASS_NAMES_FILE, MODELS_DIR
import shutil


def export_to_onnx():
    """
    Convert Keras model → ONNX → verify.
    """
    # ========================================
    # 1. Load model đã train
    # ========================================
    if not os.path.exists(BEST_MODEL_PATH):
        print("❌ Chưa có trained model!")
        print("   Chạy trước: python src/train.py")
        sys.exit(1)

    print("📦 Loading trained Keras model...")
    model = tf.keras.models.load_model(BEST_MODEL_PATH)
    model.summary()

    # ========================================
    # 2. Định nghĩa input signature
    # ========================================
    # ONNX cần biết input shape + dtype để tạo graph
    # None = dynamic batch size (có thể 1, 5, 100... samples cùng lúc)
    input_signature = [
        tf.TensorSpec(
            shape=(None, EMBEDDING_DIM),  # (batch, 1024)
            dtype=tf.float32,
            name="embedding_input",
        )
    ]

    # ========================================
    # 3. Convert sang ONNX
    # ========================================
    print("\n🔄 Converting to ONNX...")
    onnx_model, _ = tf2onnx.convert.from_keras(
        model,
        input_signature=input_signature,
        opset=13,  # ONNX opset 13: tương thích tốt với OnnxRuntime C#
    )

    # ========================================
    # 4. Lưu file và copy class_names
    # ========================================
    onnx.save(onnx_model, ONNX_MODEL_PATH)
    shutil.copy2(CLASS_NAMES_FILE, os.path.join(MODELS_DIR, "class_names.txt"))
    size_mb = os.path.getsize(ONNX_MODEL_PATH) / (1024 * 1024)
    print(f"\n💾 Đã lưu: {ONNX_MODEL_PATH}")
    print(f"💾 Đã copy: class_names.txt vào models/")
    print(f"   File size: {size_mb:.2f} MB")

    # ========================================
    # 5. Verify: Keras output == ONNX output?
    # ========================================
    print("\n🔍 Verifying ONNX model...")
    verify_onnx(model)

    # ========================================
    # 6. Hướng dẫn tiếp theo
    # ========================================
    print(f"\n{'=' * 60}")
    print("✅ EXPORT THÀNH CÔNG!")
    print(f"{'=' * 60}")
    print(f"\nFile ONNX: {ONNX_MODEL_PATH}")
    print(f"File Classes: {os.path.join(MODELS_DIR, 'class_names.txt')}")
    print(f"\nCopy 2 file này vào project .NET:")
    print(f"  cp {ONNX_MODEL_PATH} /path/to/dotnet-project/Models/")
    print(f"  cp {os.path.join(MODELS_DIR, 'class_names.txt')} /path/to/dotnet-project/Models/")
    print(f"\nCài NuGet trong project .NET:")
    print(f"  dotnet add package Microsoft.ML.OnnxRuntime")
    print(f"\nC# inference code:")
    print(f"""
    var classNames = File.ReadAllLines("Models/class_names.txt");
    var session = new InferenceSession("Models/instrument_detector.onnx");
    var tensor = new DenseTensor<float>(embedding, new[] {{ 1, 1024 }});
    var inputs = new List<NamedOnnxValue> {{
        NamedOnnxValue.CreateFromTensor("embedding_input", tensor)
    }};
    var result = session.Run(inputs);
    var scores = result.First().AsEnumerable<float>().ToArray();
    
    int maxIndex = Array.IndexOf(scores, scores.Max());
    Console.WriteLine($"Predicted: {{classNames[maxIndex]}} (Score: {{scores[maxIndex]}})");
    """)


def verify_onnx(keras_model):
    """
    So sánh output Keras vs ONNX trên cùng input.

    Tạo 5 dummy embeddings → chạy qua cả 2 → so sánh.
    Max difference < 1e-5 → OK.
    """
    dummy = np.random.randn(5, EMBEDDING_DIM).astype(np.float32)

    # Keras output
    keras_out = keras_model.predict(dummy, verbose=0).flatten()

    # ONNX output
    sess = ort.InferenceSession(ONNX_MODEL_PATH)
    input_name = sess.get_inputs()[0].name
    onnx_out = sess.run(None, {input_name: dummy})[0].flatten()

    # So sánh
    diff = np.max(np.abs(keras_out - onnx_out))
    print(f"  Keras:  {keras_out}")
    print(f"  ONNX:   {onnx_out}")
    print(f"  Max diff: {diff:.10f}")

    if diff < 1e-5:
        print("  ✅ Verified — ONNX output khớp Keras!")
    else:
        print("  ⚠️ Sai số lớn, cần kiểm tra lại.")


if __name__ == "__main__":
    export_to_onnx()
