# PROMPT CHO AI AGENT [1/2]: Export YAMNet Backbone → ONNX (Python Side)

> **Mục đích**: Thêm script Python export phần MobileNet v1 backbone của YAMNet
> thành file ONNX riêng (KHÔNG bao gồm preprocessing layers).
>
> **Điều kiện**: Đã có project `viettune-ai-training/` với pipeline train hoạt động.
> File `export_onnx.py` đã có (export classifier → ONNX). Cần thêm script export
> YAMNet backbone.

---

## CONTEXT KỸ THUẬT

YAMNet (TF Hub) gồm 2 phần:
1. **Preprocessing**: waveform → STFT → mel spectrogram
   - KHÔNG export được sang ONNX (chứa custom TF ops)
   - C# sẽ tự implement phần này

2. **MobileNet v1 backbone**: mel spectrogram → embedding 1024-d
   - EXPORT ĐƯỢC sang ONNX (chỉ chứa standard Conv2D, DepthwiseConv2D, Dense)
   - Đây là phần cần export

Thông số mel spectrogram mà YAMNet kỳ vọng (C# phải tạo đúng format này):
- Input shape: (1, 96, 64, 1) — batch=1, 96 frames, 64 mel bins, 1 channel
- Giá trị: log-mel spectrogram, công thức: log(mel_spectrogram + 0.001)
- Mel spectrogram tạo từ: STFT window 25ms (400 samples), hop 10ms (160 samples),
  periodic Hann window, 64 mel bins, range 125-7500 Hz, sample rate 16kHz

Sau khi có 2 file ONNX:
- `yamnet_backbone.onnx`:  input (1, 96, 64, 1) → output (1, 1024)
- `instrument_classifier.onnx`: input (1, 1024) → output (1, NUM_CLASSES)

C# pipeline:
  Audio → resample 16kHz → cắt frame 0.96s → mel spectrogram 96×64
  → ONNX 1 (backbone) → embedding 1024
  → ONNX 2 (classifier) → scores

---

## TẠO FILE: src/export_yamnet_backbone.py

Tạo file mới trong thư mục `src/`. KHÔNG sửa file nào khác.

### Nội dung script:

```
1. Load YAMNet từ TF Hub:
   yamnet_model = hub.load("https://tfhub.dev/google/yamnet/1")

2. Tạo combined Keras model chỉ chứa backbone:
   
   YAMNet TF Hub model KHÔNG expose layers riêng lẻ như Keras model thông thường.
   Nhưng nó CÓ expose embeddings output. Cách lấy backbone:
   
   Approach: Tạo tf.function nhận mel spectrogram, chạy qua YAMNet internal layers,
   trả về embeddings.
   
   YAMNet TF Hub model có structure nội bộ:
   - Input waveform → preprocessing → mel spectrogram patches (N, 96, 64)
   - Mel patches → MobileNet backbone → embeddings (N, 1024)
   - Embeddings → logistic classifier → scores (N, 521)
   
   Vì TF Hub model không expose backbone riêng, dùng cách sau:
   
   a) Feed dummy waveform 0.96s (15360 samples) → lấy 1 embedding
   b) Trace internal graph để tìm backbone sub-model
   
   HOẶC (đơn giản hơn, khuyến nghị):
   
   a) Tải YAMNet weights file (yamnet.h5) trực tiếp
   b) Dùng yamnet source code từ tensorflow/models repo để build Keras model
   c) Load weights vào Keras model
   d) Cắt model: chỉ lấy từ input mel spectrogram → embedding output
   e) Export phần đã cắt sang ONNX

3. CÁCH IMPLEMENT CỤ THỂ (khuyến nghị):

   Bước 1: Clone YAMNet source code
   ```bash
   git clone https://github.com/tensorflow/models.git /tmp/tf_models
   ```
   
   Bước 2: Import yamnet source, build model, load weights
   ```python
   import sys
   sys.path.insert(0, '/tmp/tf_models/research/audioset/yamnet')
   import yamnet as yamnet_model
   import params as yamnet_params
   
   # Build YAMNet Keras model
   params = yamnet_params.Params()
   yamnet = yamnet_model.yamnet(params)
   yamnet.load_weights('yamnet.h5')
   
   # yamnet model: Input (batch, 96, 64) → Output gồm nhiều layers
   # Tìm embedding layer (trước logistic layer cuối)
   # Embedding layer output shape = (batch, 1024)
   ```
   
   Bước 3: Tạo sub-model chỉ lấy đến embedding
   ```python
   # Tìm layer có output shape (None, 1024)
   # Thường là layer cuối cùng trước Dense(521)
   
   for layer in yamnet.layers:
       if len(layer.output_shape) == 2 and layer.output_shape[1] == 1024:
           embedding_layer = layer
           break
   
   # Tạo sub-model
   backbone = tf.keras.Model(
       inputs=yamnet.input,
       outputs=embedding_layer.output,
       name="yamnet_backbone"
   )
   backbone.summary()
   # Input: (None, 96, 64) — mel spectrogram patch
   # Output: (None, 1024) — embedding
   ```
   
   Bước 4: Export sang ONNX
   ```python
   import tf2onnx
   import onnx
   
   input_signature = [
       tf.TensorSpec(shape=(1, 96, 64, 1), dtype=tf.float32, name="mel_spectrogram")
   ]
   # NOTE: YAMNet Keras model có thể nhận input (batch, 96, 64) HOẶC (batch, 96, 64, 1)
   # Kiểm tra backbone.input_shape để xác định đúng
   # Nếu input là (None, 96, 64) → reshape trong script trước khi export
   
   onnx_model, _ = tf2onnx.convert.from_keras(
       backbone,
       input_signature=input_signature,
       opset=13,
   )
   
   onnx.save(onnx_model, "models/yamnet_backbone.onnx")
   ```
   
   Bước 5: Verify
   ```python
   import onnxruntime as ort
   import numpy as np
   
   # Test với dummy mel spectrogram
   dummy_mel = np.random.randn(1, 96, 64, 1).astype(np.float32)
   
   # Keras output
   keras_out = backbone.predict(dummy_mel)
   
   # ONNX output
   sess = ort.InferenceSession("models/yamnet_backbone.onnx")
   onnx_out = sess.run(None, {sess.get_inputs()[0].name: dummy_mel})[0]
   
   diff = np.max(np.abs(keras_out - onnx_out))
   print(f"Max diff: {diff}")  # Phải < 1e-5
   print(f"Output shape: {onnx_out.shape}")  # Phải là (1, 1024)
   ```

4. Nếu approach trên lỗi (không tìm được embedding layer, hoặc yamnet source
   code không tương thích), dùng FALLBACK:
   
   ```python
   # Fallback: dùng TF Hub model trực tiếp
   # Feed 1 frame mel spectrogram → trace graph → export sub-graph
   
   yamnet_hub = hub.load("https://tfhub.dev/google/yamnet/1")
   
   # Tạo wrapper function chỉ lấy embeddings
   # Lưu ý: TF Hub YAMNet nhận waveform, không nhận mel spectrogram
   # Nên fallback này phải feed waveform 0.96s → lấy 1 embedding
   # Rồi export TOÀN BỘ (preprocessing + backbone) nhưng chỉ output embedding
   
   @tf.function(input_signature=[
       tf.TensorSpec(shape=[15360], dtype=tf.float32, name="waveform")
   ])
   def get_embedding(waveform):
       scores, embeddings, spectrogram = yamnet_hub(waveform)
       return embeddings  # (1, 1024) cho 0.96s input
   
   # Export
   onnx_model, _ = tf2onnx.convert.from_function(
       get_embedding,
       input_signature=[tf.TensorSpec(shape=[15360], dtype=tf.float32)],
       opset=15,
       output_path="models/yamnet_backbone.onnx"
   )
   ```
   
   ⚠️ FALLBACK này input là waveform (15360 samples) thay vì mel spectrogram.
   Nếu dùng fallback: C# KHÔNG cần tạo mel spectrogram, chỉ cần feed waveform 0.96s.
   Nhưng fallback CÓ THỂ lỗi vì preprocessing ops (STFT).
   
   Nếu cả 2 cách đều lỗi → thông báo user chuyển sang Cách 3 (Python microservice).

5. Output files:
   - models/yamnet_backbone.onnx (hoặc tên khác nếu dùng fallback)
   - In rõ: input shape, output shape, file size
   - In rõ: backbone nhận mel spectrogram hay waveform (để C# biết)
```

### Download YAMNet weights

Script cần tự download nếu chưa có:
```bash
curl -O https://storage.googleapis.com/audioset/yamnet.h5
```

### Thêm vào requirements.txt (nếu chưa có)

Không cần thêm package mới. Các dependencies đã có:
tensorflow, tensorflow-hub, tf2onnx, onnxruntime, numpy.

### Output mong đợi

```
models/
├── yamnet_backbone.onnx          ← MỚI: MobileNet v1 backbone (~15MB)
├── instrument_classifier.onnx    ← ĐÃ CÓ: classifier (~1.2MB)
├── class_names.txt               ← ĐÃ CÓ: mapping classes
└── best_model.keras              ← ĐÃ CÓ: Keras model
```

### Pipeline chạy hoàn chỉnh

```bash
# Bước 1-3: đã có
python src/extract_embeddings.py
python src/train.py
python src/export_onnx.py          # → instrument_classifier.onnx

# Bước 4: MỚI
python src/export_yamnet_backbone.py  # → yamnet_backbone.onnx

# Copy 3 files vào project .NET:
#   yamnet_backbone.onnx
#   instrument_classifier.onnx
#   class_names.txt
```

---

## KIỂM TRA SAU KHI TẠO

```bash
# 1. Chạy script
python src/export_yamnet_backbone.py

# 2. Verify output
python -c "
import onnxruntime as ort
import numpy as np

sess = ort.InferenceSession('models/yamnet_backbone.onnx')
inp = sess.get_inputs()[0]
out = sess.get_outputs()[0]
print(f'Input: {inp.name} {inp.shape} {inp.type}')
print(f'Output: {out.name} {out.shape} {out.type}')

# Test inference
dummy = np.random.randn(*[d if isinstance(d,int) else 1 for d in inp.shape]).astype(np.float32)
result = sess.run(None, {inp.name: dummy})[0]
print(f'Result shape: {result.shape}')
print(f'Result sample: {result[0,:5]}')
"

# Kết quả mong đợi:
# Input: mel_spectrogram [1, 96, 64, 1] tensor(float)   (hoặc [1, 96, 64])
# Output: ... [1, 1024] tensor(float)
# Result shape: (1, 1024)
```
