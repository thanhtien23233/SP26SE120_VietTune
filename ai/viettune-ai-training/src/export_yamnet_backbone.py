"""
export_yamnet_backbone.py — Export YAMNet backbone → ONNX

CÁCH CHẠY:
    python src/export_yamnet_backbone.py

KHÔNG cần AI agent chạy. Chạy tay trên terminal.
Chờ 3-5 phút cho bước Converting.

OUTPUT:
    models/yamnet_backbone.onnx
    Input:  float32[15360]  (0.96 giây audio, 16kHz mono)
    Output: float32[N, 1024] (N embeddings, thường N=1 cho 0.96s)

LƯU Ý:
    - File ONNX này chứa CẢ preprocessing (STFT + mel) + MobileNet backbone
    - C# chỉ cần đưa waveform thô vào, KHÔNG cần tạo mel spectrogram
    - Nếu script lỗi ở bước tf2onnx, xem FALLBACK ở cuối file
"""

import os
import sys
import numpy as np

# Đảm bảo import config đúng
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Suppress TF warnings
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")
os.makedirs(MODELS_DIR, exist_ok=True)
ONNX_PATH = os.path.join(MODELS_DIR, "yamnet_backbone.onnx")

# Số samples cho 0.96 giây audio tại 16kHz
WAVEFORM_LENGTH = 15360


def export_method_1():
    """
    Method 1: tf.function + tf2onnx.convert.from_function
    Đây là cách ổn định nhất.
    """
    import tensorflow as tf
    import tensorflow_hub as hub
    import tf2onnx

    print("=" * 60)
    print("METHOD 1: tf.function → tf2onnx")
    print("=" * 60)

    # 1. Load YAMNet
    print("\n[1/4] Loading YAMNet from TF Hub...")
    print("      (Lần đầu tải ~20MB, lần sau dùng cache)")
    yamnet_model = hub.load("https://tfhub.dev/google/yamnet/1")
    print("      ✅ YAMNet loaded")

    # 2. Wrap trong tf.function với input_signature cố định
    print("\n[2/4] Creating tf.function wrapper...")

    @tf.function(input_signature=[
        tf.TensorSpec(shape=[WAVEFORM_LENGTH], dtype=tf.float32)
    ])
    def predict(waveform):
        scores, embeddings, spectrogram = yamnet_model(waveform)
        return embeddings

    # 3. Trace graph (bắt buộc trước khi convert)
    print("      Tracing graph...")
    dummy = tf.zeros([WAVEFORM_LENGTH], dtype=tf.float32)
    test_output = predict(dummy)
    print(f"      Trace OK — output shape: {test_output.shape}")

    # 4. Convert sang ONNX
    print("\n[3/4] Converting to ONNX...")
    print("      ⏳ Bước này mất 3-5 phút, đừng tắt terminal!")

    model_proto, _ = tf2onnx.convert.from_function(
        predict,
        input_signature=[
            tf.TensorSpec(shape=[WAVEFORM_LENGTH], dtype=tf.float32, name="waveform")
        ],
        opset=15,
        output_path=ONNX_PATH,
    )

    print(f"      ✅ Saved: {ONNX_PATH}")
    size_mb = os.path.getsize(ONNX_PATH) / (1024 * 1024)
    print(f"      Size: {size_mb:.1f} MB")

    # 5. Verify
    print("\n[4/4] Verifying ONNX...")
    verify_onnx()

    return True


def export_method_2():
    """
    Method 2: Save concrete function → convert saved model
    Fallback nếu method 1 lỗi.
    """
    import tensorflow as tf
    import tensorflow_hub as hub
    import tf2onnx

    print("=" * 60)
    print("METHOD 2: Concrete function → saved model → tf2onnx")
    print("=" * 60)

    # 1. Load YAMNet
    print("\n[1/5] Loading YAMNet...")
    yamnet_model = hub.load("https://tfhub.dev/google/yamnet/1")

    # 2. Tạo wrapper module
    print("\n[2/5] Creating wrapper module...")

    class YamNetWrapper(tf.Module):
        def __init__(self, model):
            super().__init__()
            self.model = model

        @tf.function(input_signature=[
            tf.TensorSpec(shape=[WAVEFORM_LENGTH], dtype=tf.float32)
        ])
        def predict(self, waveform):
            scores, embeddings, spectrogram = self.model(waveform)
            return embeddings

    wrapper = YamNetWrapper(yamnet_model)

    # 3. Test
    print("      Testing...")
    test_out = wrapper.predict(tf.zeros([WAVEFORM_LENGTH]))
    print(f"      Output shape: {test_out.shape}")

    # 4. Save as SavedModel
    temp_dir = os.path.join(MODELS_DIR, "_temp_yamnet_saved")
    print(f"\n[3/5] Saving temp SavedModel...")
    tf.saved_model.save(
        wrapper,
        temp_dir,
        signatures={"serving_default": wrapper.predict}
    )

    # 5. Convert
    print("\n[4/5] Converting to ONNX...")
    print("      ⏳ Chờ 3-5 phút...")

    os.system(
        f'"{sys.executable}" -m tf2onnx.convert '
        f'--saved-model "{temp_dir}" '
        f'--output "{ONNX_PATH}" '
        f'--opset 15 '
        f'--signature_def serving_default'
    )

    # Cleanup temp
    import shutil
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)

    if os.path.exists(ONNX_PATH):
        size_mb = os.path.getsize(ONNX_PATH) / (1024 * 1024)
        print(f"      ✅ Saved: {ONNX_PATH} ({size_mb:.1f} MB)")
        print("\n[5/5] Verifying...")
        verify_onnx()
        return True
    else:
        print("      ❌ ONNX file not created")
        return False


def export_method_3():
    """
    Method 3: Export chỉ MobileNet backbone (không có preprocessing)
    Fallback cuối cùng — C# phải tự tạo mel spectrogram.
    """
    import tensorflow as tf
    import tf2onnx

    print("=" * 60)
    print("METHOD 3: Export MobileNet backbone only (no preprocessing)")
    print("=" * 60)

    # 1. Download yamnet.h5 weights
    weights_path = os.path.join(MODELS_DIR, "yamnet.h5")
    if not os.path.exists(weights_path):
        print("\n[1/5] Downloading yamnet.h5...")
        import urllib.request
        url = "https://storage.googleapis.com/audioset/yamnet.h5"
        urllib.request.urlretrieve(url, weights_path)
        print(f"      ✅ Downloaded: {weights_path}")
    else:
        print(f"\n[1/5] yamnet.h5 already exists")

    # 2. Clone YAMNet source (chỉ 3 files)
    yamnet_src_dir = os.path.join(MODELS_DIR, "_yamnet_src")
    os.makedirs(yamnet_src_dir, exist_ok=True)

    files_to_download = {
        "yamnet.py": "https://raw.githubusercontent.com/tensorflow/models/master/research/audioset/yamnet/yamnet.py",
        "params.py": "https://raw.githubusercontent.com/tensorflow/models/master/research/audioset/yamnet/params.py",
        "features_lib.py": "https://raw.githubusercontent.com/tensorflow/models/master/research/audioset/yamnet/features_lib.py",
    }

    print("\n[2/5] Downloading YAMNet source files...")
    import urllib.request
    for fname, url in files_to_download.items():
        fpath = os.path.join(yamnet_src_dir, fname)
        if not os.path.exists(fpath):
            try:
                urllib.request.urlretrieve(url, fpath)
                print(f"      ✅ {fname}")
            except Exception as e:
                print(f"      ❌ {fname}: {e}")
                return False

    # 3. Build Keras model, load weights
    print("\n[3/5] Building YAMNet Keras model...")
    sys.path.insert(0, yamnet_src_dir)

    try:
        import importlib
        if "params" in sys.modules:
            del sys.modules["params"]
        if "yamnet" in sys.modules:
            del sys.modules["yamnet"]

        import params as yamnet_params
        import yamnet as yamnet_module

        params = yamnet_params.Params()
        yamnet_keras = yamnet_module.yamnet(params)
        yamnet_keras.load_weights(weights_path)
        print(f"      ✅ Model loaded: {yamnet_keras.input_shape} → {yamnet_keras.output_shape}")
    except Exception as e:
        print(f"      ❌ Failed to build model: {e}")
        return False

    # 4. Tạo sub-model chỉ lấy embedding layer (1024-d)
    print("\n[4/5] Extracting embedding sub-model...")
    embedding_layer = None
    for layer in reversed(yamnet_keras.layers):
        if hasattr(layer, "output_shape"):
            shape = layer.output_shape
            if isinstance(shape, tuple) and len(shape) == 2 and shape[1] == 1024:
                embedding_layer = layer
                print(f"      Found embedding layer: {layer.name} → {shape}")
                break

    if embedding_layer is None:
        print("      ❌ Could not find embedding layer (1024-d)")
        print("      Available layers:")
        for layer in yamnet_keras.layers:
            if hasattr(layer, "output_shape"):
                print(f"        {layer.name}: {layer.output_shape}")
        return False

    backbone = tf.keras.Model(
        inputs=yamnet_keras.input,
        outputs=embedding_layer.output,
        name="yamnet_backbone"
    )
    backbone.summary()

    # 5. Export backbone → ONNX
    print("\n[5/5] Converting backbone to ONNX...")
    input_shape = backbone.input_shape  # (None, 96, 64) hoặc tương tự

    # Tạo input signature phù hợp
    spec_shape = [1] + list(input_shape[1:])
    if len(spec_shape) == 3:
        # Thêm channel dimension nếu cần: (1, 96, 64) → (1, 96, 64, 1)
        spec_shape.append(1)

    input_sig = [tf.TensorSpec(shape=spec_shape, dtype=tf.float32, name="mel_spectrogram")]

    try:
        onnx_model, _ = tf2onnx.convert.from_keras(
            backbone,
            input_signature=input_sig,
            opset=13,
        )
        import onnx
        onnx.save(onnx_model, ONNX_PATH)
        size_mb = os.path.getsize(ONNX_PATH) / (1024 * 1024)
        print(f"      ✅ Saved: {ONNX_PATH} ({size_mb:.1f} MB)")

        # Verify
        verify_onnx()

        print("\n⚠️  METHOD 3: Input là MEL SPECTROGRAM, không phải waveform!")
        print("    C# cần tự tạo mel spectrogram trước khi đưa vào ONNX.")
        return True

    except Exception as e:
        print(f"      ❌ ONNX conversion failed: {e}")
        return False


def verify_onnx():
    """Verify ONNX model hoạt động."""
    import onnxruntime as ort

    sess = ort.InferenceSession(ONNX_PATH)

    inp = sess.get_inputs()[0]
    out = sess.get_outputs()[0]
    print(f"\n  ONNX Input:  {inp.name}  shape={inp.shape}  type={inp.type}")
    print(f"  ONNX Output: {out.name}  shape={out.shape}  type={out.type}")

    # Dummy inference
    dummy_shape = [d if isinstance(d, int) else 1 for d in inp.shape]
    dummy = np.random.randn(*dummy_shape).astype(np.float32) * 0.01
    result = sess.run(None, {inp.name: dummy})[0]
    print(f"  Test output shape: {result.shape}")

    # Check embedding dimension
    if result.shape[-1] == 1024:
        print(f"  ✅ Output dimension = 1024 — correct!")
    else:
        print(f"  ⚠️  Output dimension = {result.shape[-1]} — expected 1024")

    print(f"\n  📋 THÔNG SỐ CHO C#:")
    print(f"  Input name:  \"{inp.name}\"")
    print(f"  Input shape: {inp.shape}")
    print(f"  Output name: \"{out.name}\"")
    print(f"  Output shape: {out.shape}")

    is_waveform = (len(inp.shape) == 1) or (len(inp.shape) == 2 and inp.shape[-1] > 1000)
    if is_waveform:
        print(f"\n  ✅ Input = WAVEFORM (audio thô)")
        print(f"  → C# KHÔNG cần tạo mel spectrogram")
        print(f"  → Chỉ cần: resample 16kHz mono → cắt {WAVEFORM_LENGTH} samples → đưa vào ONNX")
    else:
        print(f"\n  ⚠️  Input = MEL SPECTROGRAM")
        print(f"  → C# CẦN tạo mel spectrogram (STFT + mel filterbank + log)")
        print(f"  → Thông số: window 25ms, hop 10ms, 64 mel bins, 125-7500Hz, log(x+0.001)")


def main():
    """
    Thử 3 methods theo thứ tự. Dừng khi method nào thành công.
    Method 1: tf.function → ONNX (input = waveform, đơn giản nhất cho C#)
    Method 2: saved model → ONNX (input = waveform, backup)
    Method 3: keras backbone → ONNX (input = mel spectrogram, C# phải tự tạo mel)
    """

    if os.path.exists(ONNX_PATH):
        print(f"⚠️  File đã tồn tại: {ONNX_PATH}")
        print(f"   Xóa file cũ và chạy lại nếu muốn export lại.")
        print(f"   Verify file hiện có:")
        verify_onnx()
        return

    print("🚀 EXPORT YAMNET BACKBONE → ONNX")
    print(f"   Output: {ONNX_PATH}")
    print(f"   Sẽ thử 3 methods theo thứ tự.\n")

    # Method 1
    try:
        if export_method_1():
            print("\n" + "=" * 60)
            print("✅ THÀNH CÔNG với Method 1!")
            print("=" * 60)
            return
    except Exception as e:
        print(f"\n❌ Method 1 failed: {e}")

    # Xóa file lỗi nếu có
    if os.path.exists(ONNX_PATH):
        os.remove(ONNX_PATH)

    # Method 2
    try:
        if export_method_2():
            print("\n" + "=" * 60)
            print("✅ THÀNH CÔNG với Method 2!")
            print("=" * 60)
            return
    except Exception as e:
        print(f"\n❌ Method 2 failed: {e}")

    # Xóa file lỗi nếu có
    if os.path.exists(ONNX_PATH):
        os.remove(ONNX_PATH)

    # Method 3
    try:
        if export_method_3():
            print("\n" + "=" * 60)
            print("✅ THÀNH CÔNG với Method 3!")
            print("   ⚠️  LƯU Ý: C# cần tạo mel spectrogram (xem log ở trên)")
            print("=" * 60)
            return
    except Exception as e:
        print(f"\n❌ Method 3 failed: {e}")

    # Tất cả đều lỗi
    print("\n" + "=" * 60)
    print("❌ TẤT CẢ 3 METHODS ĐỀU LỖI!")
    print("=" * 60)
    print("\nGợi ý:")
    print("  1. Chuyển sang Python microservice (FastAPI)")
    print("     → Python chạy YAMNet native, .NET gọi qua HTTP")
    print("  2. Liên hệ người hướng dẫn để được hỗ trợ thêm")


if __name__ == "__main__":
    main()
