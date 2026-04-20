# PROMPT CHO AI AGENT [1/2]: Tải YAMNet ONNX + Export Classifier (Python Side)

> **Mục đích**: Hướng dẫn AI agent setup phần Python: tải YAMNet backbone ONNX
> có sẵn từ HuggingFace (KHÔNG tự convert), và export classifier đã train.
>
> **Thay đổi so với trước**: Bỏ hoàn toàn `export_yamnet_backbone.py`.
> Dùng file ONNX có sẵn từ STMicroelectronics trên HuggingFace.

---

## CONTEXT

STMicroelectronics đã export sẵn YAMNet-1024 backbone (MobileNet v1, 3.2M params)
sang ONNX, bỏ preprocessing layers. File này có sẵn trên HuggingFace.

Thông số:
- Input: float32[1, 64, 96, 1] — (batch, n_mels, n_frames, channel)
  ⚠️ LƯU Ý: format là (n_mels=64, n_frames=96), KHÔNG phải (n_frames=96, n_mels=64)
- Output: float32[1, 1024] — embedding vector
- Mel spectrogram specs: window 25ms, hop 10ms, 64 mel bins, 125-7500 Hz

---

## BƯỚC 1: TẢI YAMNET ONNX TỪ HUGGINGFACE

### Cách 1: Dùng huggingface_hub (khuyến nghị)

```bash
pip install huggingface_hub --break-system-packages
```

```python
from huggingface_hub import hf_hub_download

# Tải file ONNX vào thư mục models/
path = hf_hub_download(
    repo_id="STMicroelectronics/yamnet",
    filename="yamnet_1024_int8.onnx",
    local_dir="./models"
)
print(f"Downloaded: {path}")
```

### Cách 2: Download thủ công

Vào https://huggingface.co/STMicroelectronics/yamnet/tree/main
→ Tìm file ONNX có "1024" trong tên → Download → Đặt vào `models/`

### Cách 3: Dùng wget/curl

```bash
# URL có thể thay đổi — kiểm tra trên HuggingFace nếu lỗi 404
wget -O models/yamnet_1024.onnx \
  "https://huggingface.co/STMicroelectronics/yamnet/resolve/main/yamnet_1024_int8.onnx"
```

---

## BƯỚC 2: VERIFY YAMNET ONNX

Chạy ngay sau khi tải để xác nhận input/output shapes:

```python
import onnxruntime as ort
import numpy as np

sess = ort.InferenceSession("models/yamnet_1024_int8.onnx")

# In tất cả inputs
for inp in sess.get_inputs():
    print(f"Input:  name={inp.name}  shape={inp.shape}  type={inp.type}")

# In tất cả outputs
for out in sess.get_outputs():
    print(f"Output: name={out.name}  shape={out.shape}  type={out.type}")

# Test inference
input_name = sess.get_inputs()[0].name
input_shape = sess.get_inputs()[0].shape

# Tạo dummy input theo đúng shape model yêu cầu
# Shape có thể là [1, 64, 96, 1] hoặc [1, 96, 64, 1] — dùng đúng shape từ model
dummy = np.random.randn(*[d if isinstance(d, int) else 1 for d in input_shape]).astype(np.float32)
result = sess.run(None, {input_name: dummy})[0]

print(f"\nTest inference:")
print(f"  Input shape:  {dummy.shape}")
print(f"  Output shape: {result.shape}")
print(f"  Output sample: {result[0, :5]}")

# Kiểm tra output dimension = 1024
assert result.shape[-1] == 1024, f"Expected 1024, got {result.shape[-1]}"
print(f"\n✅ YAMNet backbone ONNX verified!")

# GHI NHỚ VÀ IN RA: input shape chính xác
# C# cần biết shape này để tạo tensor đúng
print(f"\n📋 THÔNG TIN CHO C#:")
print(f"  Input name:  {input_name}")
print(f"  Input shape: {input_shape}")
print(f"  Output shape: {result.shape}")
```

**QUAN TRỌNG**: Ghi nhớ output của bước verify này. Đặc biệt:
- `input_name`: tên input tensor (C# cần dùng)
- `input_shape`: shape chính xác — có thể là `[1, 64, 96, 1]` hoặc `[1, 96, 64, 1]`
  hoặc `[1, 64, 96]` (không có channel dimension)
- C# sẽ cần reshape mel spectrogram cho khớp shape này

---

## BƯỚC 3: EXPORT CLASSIFIER → ONNX (đã có sẵn script)

Nếu chưa chạy:

```bash
python src/extract_embeddings.py   # Extract YAMNet embeddings (~5-10 phút)
python src/train.py                # Train classifier (~2-5 phút)
python src/export_onnx.py          # Export classifier → ONNX (~30 giây)
```

Sau bước này có: `models/instrument_classifier.onnx`
- Input: float32[1, 1024]
- Output: float32[1, NUM_CLASSES]

---

## BƯỚC 4: VERIFY CẢ 2 ONNX CHẠY NỐI TIẾP

Test end-to-end: dummy mel spectrogram → backbone → classifier → scores

```python
import onnxruntime as ort
import numpy as np

# Load 2 sessions
backbone_sess = ort.InferenceSession("models/yamnet_1024_int8.onnx")
classifier_sess = ort.InferenceSession("models/instrument_classifier.onnx")

# Load class names
with open("models/class_names.txt", "r") as f:
    class_names = [line.strip() for line in f if line.strip()]

# Backbone info
bb_input_name = backbone_sess.get_inputs()[0].name
bb_input_shape = backbone_sess.get_inputs()[0].shape

# Classifier info
cl_input_name = classifier_sess.get_inputs()[0].name

# Dummy mel spectrogram
dummy_mel = np.random.randn(*[d if isinstance(d, int) else 1 for d in bb_input_shape]).astype(np.float32)

# Backbone: mel → embedding
embedding = backbone_sess.run(None, {bb_input_name: dummy_mel})[0]
print(f"Backbone:   {dummy_mel.shape} → {embedding.shape}")

# Classifier: embedding → scores
scores = classifier_sess.run(None, {cl_input_name: embedding})[0]
print(f"Classifier: {embedding.shape} → {scores.shape}")

# Interpret
predicted_idx = np.argmax(scores[0])
print(f"\nPredicted: {class_names[predicted_idx]} ({scores[0][predicted_idx]:.3f})")
print(f"All scores: {dict(zip(class_names, scores[0].tolist()))}")

print(f"\n✅ End-to-end pipeline verified!")
print(f"\n📋 FILES ĐỂ COPY VÀO .NET PROJECT:")
print(f"  1. models/yamnet_1024_int8.onnx         (backbone ~15MB)")
print(f"  2. models/instrument_classifier.onnx     (classifier ~1.2MB)")
print(f"  3. models/class_names.txt                (class mapping)")
print(f"\n📋 THÔNG SỐ CHO C# MelSpectrogramExtractor:")
print(f"  Backbone input name:  {bb_input_name}")
print(f"  Backbone input shape: {bb_input_shape}")
print(f"  → C# phải tạo mel spectrogram ĐÚNG shape này")
print(f"  → Nếu shape là [1, 64, 96, 1]: mel format (n_mels, n_frames)")
print(f"  → Nếu shape là [1, 96, 64, 1]: mel format (n_frames, n_mels)")
```

---

## BƯỚC 5: TẠO SCRIPT TẢI TỰ ĐỘNG (tùy chọn)

Tạo `src/download_yamnet.py` để agent hoặc developer chạy 1 lần:

```python
"""
download_yamnet.py — Tải YAMNet backbone ONNX từ HuggingFace.
Chạy 1 lần. Kết quả lưu vào models/yamnet_1024_int8.onnx
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import MODELS_DIR

YAMNET_ONNX_PATH = os.path.join(MODELS_DIR, "yamnet_1024_int8.onnx")

def download():
    if os.path.exists(YAMNET_ONNX_PATH):
        size_mb = os.path.getsize(YAMNET_ONNX_PATH) / (1024 * 1024)
        print(f"✅ Đã có: {YAMNET_ONNX_PATH} ({size_mb:.1f}MB)")
        return

    print("📥 Đang tải YAMNet backbone ONNX từ HuggingFace...")
    try:
        from huggingface_hub import hf_hub_download
        path = hf_hub_download(
            repo_id="STMicroelectronics/yamnet",
            filename="yamnet_1024_int8.onnx",
            local_dir=MODELS_DIR,
        )
        size_mb = os.path.getsize(path) / (1024 * 1024)
        print(f"✅ Tải thành công: {path} ({size_mb:.1f}MB)")
    except ImportError:
        print("❌ Cần cài: pip install huggingface_hub")
        print("   Hoặc tải thủ công từ:")
        print("   https://huggingface.co/STMicroelectronics/yamnet/tree/main")
        sys.exit(1)

if __name__ == "__main__":
    download()
```

---

## OUTPUT CUỐI CÙNG

```
models/
├── yamnet_1024_int8.onnx         ← TẢI TỪ HUGGINGFACE (~15MB)
├── instrument_classifier.onnx    ← EXPORT TỪ PYTHON (~1.2MB)
├── class_names.txt               ← EXPORT TỪ PYTHON
└── best_model.keras              ← Keras model (không cần cho .NET)
```

---

## PIPELINE HOÀN CHỈNH (THỨ TỰ CHẠY)

```bash
# 1. Tải YAMNet backbone (10 giây, chạy 1 lần)
python src/download_yamnet.py

# 2. Extract embeddings (5-10 phút)
python src/extract_embeddings.py

# 3. Train classifier (2-5 phút)
python src/train.py

# 4. Export classifier → ONNX (30 giây)
python src/export_onnx.py

# 5. Verify end-to-end (chạy đoạn code ở Bước 4 trên)

# 6. Copy 3 files vào .NET project:
#    yamnet_1024_int8.onnx
#    instrument_classifier.onnx
#    class_names.txt
```
