# HƯỚNG DẪN SETUP HOÀN CHỈNH: YAMNet Fine-tune Nhận Diện Nhạc Cụ Dân Tộc Việt Nam

> **Mục đích file này**: Đưa cho AI agent (Claude Code, Cursor, Copilot...) để tự động tạo toàn bộ project structure, cài đặt dependencies, và thêm source code. Agent chỉ cần chạy tuần tự từ trên xuống dưới.

---

## PHẦN 1: TẠO CẤU TRÚC THƯ MỤC

```bash
# ============================================================
# Tạo thư mục gốc project
# ============================================================
mkdir -p viettune-ai-training

# ============================================================
# Tạo cấu trúc thư mục con
# ============================================================
# Thư mục data: chứa audio files và processed data
mkdir -p viettune-ai-training/data/raw/dan_bau
mkdir -p viettune-ai-training/data/raw/not_dan_bau
mkdir -p viettune-ai-training/data/processed

# Thư mục models: chứa model đã train và file ONNX export
mkdir -p viettune-ai-training/models

# Thư mục source code
mkdir -p viettune-ai-training/src

# Thư mục notebooks: Jupyter notebooks (tùy chọn, dùng khi test trên Colab)
mkdir -p viettune-ai-training/notebooks
```

Sau khi chạy, cấu trúc sẽ như sau:

```
viettune-ai-training/
├── data/
│   ├── raw/
│   │   ├── dan_bau/           ← Bỏ file .wav nhạc cụ mục tiêu vào đây
│   │   └── not_dan_bau/       ← Bỏ file .wav âm thanh khác vào đây
│   └── processed/             ← Embeddings sẽ được lưu tự động ở đây
├── models/                    ← Model .keras và .onnx sẽ xuất hiện ở đây
├── notebooks/                 ← Jupyter notebooks (tùy chọn)
└── src/                       ← Source code Python
    ├── config.py
    ├── preprocess.py
    ├── extract_embeddings.py
    ├── build_model.py
    ├── train.py
    └── export_onnx.py
```

---

## PHẦN 2: TẠO FILE DEPENDENCIES

```bash
cat > viettune-ai-training/requirements.txt << 'EOF'
# ==============================================================
# YAMNet Fine-tuning Dependencies
# ==============================================================
# Core ML framework
tensorflow==2.15.1
tf-keras==2.15.1
tensorflow-hub==0.16.1

# Audio processing
librosa==0.10.2
soundfile==0.12.1
resampy==0.4.3

# Data processing
numpy==1.26.4
scikit-learn==1.5.2

# ONNX export & verify
tf2onnx==1.16.1
onnx==1.16.1
onnxruntime==1.19.2

# Visualization
matplotlib==3.9.2
EOF
```

---

## PHẦN 3: TẠO SOURCE CODE

### File 1/6: config.py — Cấu hình toàn bộ project

```bash
cat > viettune-ai-training/src/config.py << 'PYEOF'
"""
config.py — Cấu hình chung cho toàn bộ pipeline.

Tất cả hằng số, đường dẫn, hyperparameters đều nằm ở đây.
Khi cần thay đổi (ví dụ: đổi nhạc cụ mục tiêu, điều chỉnh
learning rate...), chỉ cần sửa file này.
"""

import os

# ============================================================
# ĐƯỜNG DẪN
# ============================================================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
RAW_DIR = os.path.join(DATA_DIR, "raw")
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")
MODELS_DIR = os.path.join(BASE_DIR, "models")

# Tạo thư mục nếu chưa có
os.makedirs(PROCESSED_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

# ============================================================
# CẤU HÌNH AUDIO
# ============================================================
# YAMNet yêu cầu audio 16kHz mono.
# Mọi file audio sẽ được tự động resample về tần số này.
SAMPLE_RATE = 16000

# ============================================================
# CẤU HÌNH YAMNET
# ============================================================
# URL model pretrained trên TensorFlow Hub.
# Lần đầu chạy sẽ tự download ~20MB rồi cache lại.
YAMNET_MODEL_URL = "https://tfhub.dev/google/yamnet/1"

# Mỗi frame 0.96s audio, YAMNet output 1 vector 1024 chiều.
# Vector này mã hóa toàn bộ đặc trưng âm thanh của frame đó:
# tần số nổi bật, harmonic structure, envelope, timbre...
EMBEDDING_DIM = 1024

# ============================================================
# NHÃN (LABELS)
# ============================================================
# Binary classification: 1 = nhạc cụ mục tiêu, 0 = không phải.
#
# ĐỔI NHẠC CỤ: thay TARGET_INSTRUMENT và đổi tên thư mục data
# tương ứng. Ví dụ: TARGET_INSTRUMENT = "dan_tranh"
# thì cần thư mục data/raw/dan_tranh/ và data/raw/not_dan_tranh/
TARGET_INSTRUMENT = "dan_bau"
CLASS_NAMES = [f"not_{TARGET_INSTRUMENT}", TARGET_INSTRUMENT]
NUM_CLASSES = len(CLASS_NAMES)  # = 2

# ============================================================
# CẤU HÌNH TRAINING
# ============================================================
TEST_SIZE = 0.2              # 20% data để test
RANDOM_SEED = 42             # Seed cố định → kết quả reproducible
BATCH_SIZE = 32              # Số samples mỗi batch
EPOCHS = 50                  # Số vòng train tối đa
LEARNING_RATE = 0.001        # Tốc độ học ban đầu (Adam optimizer)
EARLY_STOPPING_PATIENCE = 5  # Dừng nếu 5 epoch không cải thiện

# ============================================================
# CẤU HÌNH DATA AUGMENTATION
# ============================================================
# Augmentation tạo thêm dữ liệu từ file gốc bằng cách biến đổi.
# Giúp model robust hơn khi gặp audio thực tế (có noise, khác pitch...)
AUGMENT_NOISE_FACTOR = 0.005     # Thêm 0.5% Gaussian noise
AUGMENT_PITCH_RANGE = (-2, 2)    # Dịch pitch ±2 semitones
AUGMENT_SPEED_RANGE = (0.9, 1.1) # Đổi tốc độ ±10%

# ============================================================
# ĐƯỜNG DẪN OUTPUT
# ============================================================
EMBEDDINGS_FILE = os.path.join(PROCESSED_DIR, "embeddings.npy")
LABELS_FILE = os.path.join(PROCESSED_DIR, "labels.npy")
BEST_MODEL_PATH = os.path.join(MODELS_DIR, "best_model.keras")
ONNX_MODEL_PATH = os.path.join(MODELS_DIR, "instrument_detector.onnx")
TRAINING_HISTORY_PLOT = os.path.join(MODELS_DIR, "training_history.png")
PYEOF
```

### File 2/6: preprocess.py — Đọc audio, chuẩn hóa, augmentation

```bash
cat > viettune-ai-training/src/preprocess.py << 'PYEOF'
"""
preprocess.py — Tiền xử lý audio.

Chức năng:
  1. Đọc file audio bất kỳ (.wav, .mp3, .flac, .ogg) → numpy array
  2. Resample về 16kHz mono (YAMNet yêu cầu)
  3. Chuẩn hóa biên độ về [-1.0, +1.0]
  4. Data augmentation: thêm noise, pitch shift, speed change

Công nghệ sử dụng:
  - librosa: thư viện audio analysis phổ biến nhất cho Python.
    Tự động convert stereo→mono, resample, normalize.
  - numpy: xử lý mảng số.
"""

import numpy as np
import librosa
import os
import sys

# Thêm thư mục src vào path để import config
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import (
    SAMPLE_RATE,
    AUGMENT_NOISE_FACTOR,
    AUGMENT_PITCH_RANGE,
    AUGMENT_SPEED_RANGE,
)


# ================================================================
# 1. ĐỌC AUDIO
# ================================================================

def load_audio(file_path: str) -> np.ndarray:
    """
    Đọc file audio và resample về 16kHz mono.

    Cách hoạt động:
    - librosa.load() mở file bằng soundfile backend
    - Tự động convert stereo → mono (trung bình 2 kênh)
    - Tự động resample về sr=16000 Hz
    - Output là numpy float32 array, giá trị trong [-1.0, +1.0]

    Ví dụ:
        File 3 phút, 44100Hz stereo
        → Output: array shape (2_880_000,) dtype float32
        Vì: 3 * 60 * 16000 = 2,880,000 samples

    Parameters:
        file_path: đường dẫn file (.wav, .mp3, .flac, .ogg)

    Returns:
        numpy array 1D (num_samples,)
    """
    waveform, sr = librosa.load(file_path, sr=SAMPLE_RATE, mono=True)
    waveform = waveform.astype(np.float32)
    return waveform


# ================================================================
# 2. CHUẨN HÓA
# ================================================================

def normalize_audio(waveform: np.ndarray) -> np.ndarray:
    """
    Chuẩn hóa biên độ về [-1.0, +1.0].

    Tại sao cần?
    - File audio khác nhau có volume khác nhau (record ở khoảng cách
      khác nhau, thiết bị khác nhau, settings khác nhau)
    - Chuẩn hóa loại bỏ ảnh hưởng của volume
    - YAMNet kỳ vọng input trong khoảng [-1.0, +1.0]

    Cách hoạt động:
    - Tìm giá trị tuyệt đối lớn nhất trong waveform
    - Chia tất cả samples cho giá trị đó
    - Kết quả: giá trị lớn nhất = 1.0 hoặc -1.0

    Parameters:
        waveform: numpy array 1D

    Returns:
        waveform đã chuẩn hóa, giá trị trong [-1.0, +1.0]
    """
    max_val = np.max(np.abs(waveform))
    if max_val > 0:
        waveform = waveform / max_val
    return waveform


# ================================================================
# 3. DATA AUGMENTATION
# ================================================================
# Mục đích: tạo thêm training data từ file gốc bằng cách biến đổi.
#
# Tại sao cần augmentation?
# - File train "sạch" (phòng thu), nhưng thực tế user upload audio
#   có tiếng gió, giọng nói, nhiều nhạc cụ...
# - Augmentation giúp model robust hơn với các điều kiện thực tế
# - Từ 10 file gốc → 50 phiên bản (gốc + 4 augmented × 10 files)

def add_noise(waveform: np.ndarray, noise_factor: float = None) -> np.ndarray:
    """
    Thêm Gaussian noise (nhiễu trắng) vào audio.

    Gaussian noise = nhiễu ngẫu nhiên theo phân phối chuẩn.
    Mô phỏng tiếng ồn nền khi thu âm ngoài trời.

    noise_factor = 0.005 nghĩa là mức nhiễu bằng 0.5% biên độ tín hiệu.
    Đủ nhỏ để không phá hủy âm thanh gốc, đủ lớn để tạo variation.

    Parameters:
        waveform: numpy array 1D
        noise_factor: mức nhiễu (mặc định lấy từ config)

    Returns:
        waveform có thêm nhiễu
    """
    if noise_factor is None:
        noise_factor = AUGMENT_NOISE_FACTOR

    noise = np.random.randn(len(waveform)).astype(np.float32)
    augmented = waveform + noise_factor * noise
    return np.clip(augmented, -1.0, 1.0)


def shift_pitch(waveform: np.ndarray, n_steps: float = None) -> np.ndarray:
    """
    Dịch cao độ (pitch) của audio lên hoặc xuống.

    Cách hoạt động (bên trong librosa):
    1. Chuyển audio sang frequency domain (STFT)
    2. Dịch tất cả tần số lên/xuống theo số semitones
    3. Chuyển ngược về time domain (ISTFT)

    Tại sao cần?
    - Cùng đàn bầu nhưng chơi ở note cao/thấp khác nhau
    - Model cần nhận diện nhạc cụ dựa trên timbre (âm sắc),
      không phải dựa trên pitch cụ thể
    - n_steps = 2 → cao hơn 2 nửa cung
    - n_steps = -2 → thấp hơn 2 nửa cung

    Parameters:
        waveform: numpy array 1D
        n_steps: số semitones dịch (mặc định random trong range config)

    Returns:
        waveform đã dịch pitch
    """
    if n_steps is None:
        n_steps = np.random.uniform(*AUGMENT_PITCH_RANGE)

    return librosa.effects.pitch_shift(
        y=waveform, sr=SAMPLE_RATE, n_steps=n_steps
    ).astype(np.float32)


def change_speed(waveform: np.ndarray, speed_factor: float = None) -> np.ndarray:
    """
    Thay đổi tốc độ phát mà KHÔNG đổi pitch.

    Cách hoạt động (bên trong librosa):
    - Dùng phase vocoder để co giãn thời gian
    - speed_factor = 1.1 → nhanh hơn 10% (audio ngắn hơn)
    - speed_factor = 0.9 → chậm hơn 10% (audio dài hơn)
    - Pitch giữ nguyên (khác với đơn giản tua nhanh/chậm)

    Tại sao cần?
    - Nghệ nhân chơi ở tempo khác nhau (nhanh/chậm)
    - Model cần nhận diện nhạc cụ bất kể tốc độ chơi

    Parameters:
        waveform: numpy array 1D
        speed_factor: hệ số tốc độ (mặc định random trong range config)

    Returns:
        waveform đã thay đổi tốc độ
    """
    if speed_factor is None:
        speed_factor = np.random.uniform(*AUGMENT_SPEED_RANGE)

    return librosa.effects.time_stretch(
        y=waveform, rate=speed_factor
    ).astype(np.float32)


def augment_waveform(waveform: np.ndarray) -> list:
    """
    Tạo 4 bản augmented từ 1 waveform gốc.

    Bản gốc    → giữ nguyên (không nằm trong list trả về)
    Bản 1      → thêm Gaussian noise
    Bản 2      → pitch shift lên 1.5 semitones
    Bản 3      → pitch shift xuống 1.5 semitones
    Bản 4      → tăng tốc 10%

    Tổng: 1 file gốc → 5 phiên bản (1 gốc + 4 augmented)

    Parameters:
        waveform: numpy array 1D đã normalize

    Returns:
        list gồm 4 waveform đã augmented
    """
    return [
        add_noise(waveform),
        shift_pitch(waveform, n_steps=1.5),
        shift_pitch(waveform, n_steps=-1.5),
        change_speed(waveform, speed_factor=1.1),
    ]


# ================================================================
# 4. UTILITY
# ================================================================

def get_all_audio_files(directory: str) -> list:
    """
    Tìm tất cả file audio trong thư mục (đệ quy, bao gồm subfolder).

    Hỗ trợ: .wav, .mp3, .flac, .ogg
    (librosa đọc được tất cả format trên thông qua soundfile backend)

    Parameters:
        directory: đường dẫn thư mục gốc

    Returns:
        list đường dẫn tuyệt đối các file audio, đã sort theo tên
    """
    supported = {".wav", ".mp3", ".flac", ".ogg"}
    audio_files = []

    for root, dirs, files in os.walk(directory):
        for f in sorted(files):
            if os.path.splitext(f)[1].lower() in supported:
                audio_files.append(os.path.join(root, f))

    return audio_files
PYEOF
```

### File 3/6: extract_embeddings.py — Trích xuất YAMNet embeddings

```bash
cat > viettune-ai-training/src/extract_embeddings.py << 'PYEOF'
"""
extract_embeddings.py — Trích xuất YAMNet embeddings từ audio files.

Đây là bước QUAN TRỌNG NHẤT trong pipeline.

Cách YAMNet hoạt động:
  1. Nhận waveform 1D (16kHz, mono)
  2. Chia thành frames: mỗi frame 0.96 giây, trượt 0.48 giây
     (overlap 50% giữa 2 frame liên tiếp)
  3. Mỗi frame → chuyển thành log-mel spectrogram (96×64 pixels)
  4. Spectrogram → MobileNet v1 CNN → embedding vector 1024 chiều

Embedding 1024 chiều này MÃ HÓA đặc trưng âm thanh:
  - Các tần số nổi bật (harmonic structure)
  - Dạng sóng bao (envelope)
  - Đặc điểm timbre (âm sắc — thứ phân biệt đàn bầu vs đàn tranh)
  - Temporal dynamics (attack, sustain, release)

Ta KHÔNG dùng 521 class output của YAMNet (toàn nhạc cụ phương Tây).
Ta chỉ lấy EMBEDDINGS → train classifier riêng phía trên.

Công nghệ:
  - tensorflow-hub: tải YAMNet pretrained model
  - numpy: lưu embeddings dạng .npy (binary, load lại nhanh)
"""

import numpy as np
import tensorflow as tf
import tensorflow_hub as hub
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import (
    YAMNET_MODEL_URL,
    RAW_DIR,
    EMBEDDINGS_FILE,
    LABELS_FILE,
    TARGET_INSTRUMENT,
)
from preprocess import (
    load_audio,
    normalize_audio,
    augment_waveform,
    get_all_audio_files,
)


def load_yamnet():
    """
    Tải YAMNet pretrained từ TensorFlow Hub.

    Lần đầu: download ~20MB từ internet → cache tại
      ~/.cache/tfhub_modules/
    Lần sau: load từ cache, không cần internet.

    YAMNet nhận input:
      - waveform: 1D float32 tensor, 16kHz mono

    YAMNet trả về 3 outputs:
      - scores:      (num_frames, 521) → xác suất 521 class AudioSet
      - embeddings:  (num_frames, 1024) → ĐÂY LÀ THỨ TA CẦN
      - spectrogram: (num_frames, 96, 64) → log-mel spectrogram

    Returns:
        model: YAMNet model object (callable)
    """
    print("=" * 60)
    print("ĐANG TẢI YAMNET MODEL TỪ TENSORFLOW HUB")
    print("(Lần đầu download ~20MB, lần sau dùng cache)")
    print("=" * 60)

    model = hub.load(YAMNET_MODEL_URL)

    print("✅ Tải YAMNet thành công!")
    print()
    return model


def extract_embeddings_from_waveform(model, waveform: np.ndarray) -> np.ndarray:
    """
    Chạy YAMNet inference trên 1 waveform → trả về embeddings.

    Ví dụ cụ thể:
    ┌─────────────────────────────────────────────────┐
    │ File: danbau_solo_01.wav (3 phút = 180 giây)    │
    │                                                  │
    │ Waveform: 180 × 16000 = 2,880,000 samples       │
    │                  ↓                               │
    │ YAMNet chia frames:                              │
    │   Frame 0:  [0.00s → 0.96s]  → embed[0]  1024-d │
    │   Frame 1:  [0.48s → 1.44s]  → embed[1]  1024-d │
    │   Frame 2:  [0.96s → 1.92s]  → embed[2]  1024-d │
    │   ...                                            │
    │   Frame 372: [178.56s → 179.52s] → embed[372]   │
    │                  ↓                               │
    │ Output: numpy array shape (373, 1024)            │
    │ Mỗi hàng = đặc trưng âm thanh của 0.96s audio   │
    └─────────────────────────────────────────────────┘

    Parameters:
        model: YAMNet model (từ load_yamnet())
        waveform: numpy 1D float32, 16kHz mono

    Returns:
        embeddings: numpy array (num_frames, 1024)
    """
    scores, embeddings, spectrogram = model(waveform)
    return embeddings.numpy()


def process_directory(model, directory: str, label: int,
                      use_augmentation: bool = True) -> tuple:
    """
    Xử lý tất cả file audio trong 1 thư mục.

    Với mỗi file:
    1. Đọc audio → normalize
    2. Extract YAMNet embeddings (gốc)
    3. Tạo augmented versions → extract embeddings
    4. Gán label cho tất cả frames

    Parameters:
        model: YAMNet model
        directory: đường dẫn thư mục chứa audio files
        label: 1 = nhạc cụ mục tiêu, 0 = không phải
        use_augmentation: True = tạo thêm augmented data

    Returns:
        (embeddings_list, labels_list)
        - embeddings_list: list các numpy arrays
        - labels_list: list các integers
    """
    all_embeddings = []
    all_labels = []

    audio_files = get_all_audio_files(directory)
    label_name = TARGET_INSTRUMENT if label == 1 else f"not_{TARGET_INSTRUMENT}"
    print(f"\n📁 Thư mục: {directory}")
    print(f"   Label: {label_name} ({label})")
    print(f"   Tìm thấy {len(audio_files)} file audio")

    if len(audio_files) == 0:
        print(f"   ⚠️ CẢNH BÁO: Không tìm thấy file audio nào!")
        print(f"   Hãy đặt file .wav vào thư mục {directory}")
        return all_embeddings, all_labels

    for i, fpath in enumerate(audio_files):
        fname = os.path.basename(fpath)
        print(f"\n   [{i+1}/{len(audio_files)}] {fname}")

        # --- Đọc & chuẩn hóa ---
        waveform = load_audio(fpath)
        waveform = normalize_audio(waveform)
        duration = len(waveform) / 16000
        print(f"      Thời lượng: {duration:.1f}s ({len(waveform):,} samples)")

        # --- Extract embeddings gốc ---
        emb = extract_embeddings_from_waveform(model, waveform)
        n = emb.shape[0]
        print(f"      → {n} frames (gốc)")

        all_embeddings.append(emb)
        all_labels.extend([label] * n)

        # --- Augmentation ---
        if use_augmentation:
            aug_names = ["noise", "pitch_up", "pitch_down", "speed_up"]
            aug_waveforms = augment_waveform(waveform)

            for j, (aug_wav, aug_name) in enumerate(
                zip(aug_waveforms, aug_names)
            ):
                aug_emb = extract_embeddings_from_waveform(model, aug_wav)
                aug_n = aug_emb.shape[0]
                print(f"      → {aug_n} frames (augment: {aug_name})")

                all_embeddings.append(aug_emb)
                all_labels.extend([label] * aug_n)

    return all_embeddings, all_labels


def process_all_data(use_augmentation: bool = True):
    """
    MAIN FUNCTION — Xử lý toàn bộ data.

    Flow:
    1. Tải YAMNet
    2. Xử lý thư mục positive (nhạc cụ mục tiêu)
    3. Xử lý thư mục negative (âm thanh khác)
    4. Ghép tất cả → lưu ra 2 file .npy

    Output:
    - data/processed/embeddings.npy → shape (total_frames, 1024)
    - data/processed/labels.npy     → shape (total_frames,)
    """
    # Tải YAMNet
    yamnet = load_yamnet()

    # Xử lý POSITIVE class
    pos_dir = os.path.join(RAW_DIR, TARGET_INSTRUMENT)
    pos_emb, pos_labels = process_directory(
        yamnet, pos_dir, label=1, use_augmentation=use_augmentation
    )

    # Xử lý NEGATIVE class
    neg_dir = os.path.join(RAW_DIR, f"not_{TARGET_INSTRUMENT}")
    neg_emb, neg_labels = process_directory(
        yamnet, neg_dir, label=0, use_augmentation=use_augmentation
    )

    # Ghép tất cả
    all_emb = pos_emb + neg_emb
    all_labels = pos_labels + neg_labels

    if len(all_emb) == 0:
        print("\n❌ KHÔNG CÓ DATA! Hãy đặt file audio vào:")
        print(f"   - {pos_dir}")
        print(f"   - {neg_dir}")
        return

    X = np.vstack(all_emb)             # (total_frames, 1024)
    y = np.array(all_labels, dtype=np.int32)  # (total_frames,)

    # In tổng kết
    print(f"\n{'=' * 60}")
    print(f"TỔNG KẾT EXTRACT EMBEDDINGS")
    print(f"{'=' * 60}")
    print(f"  Tổng frames:       {X.shape[0]:,}")
    print(f"  Embedding dim:     {X.shape[1]}")
    print(f"  Positive (label=1): {np.sum(y == 1):,} frames")
    print(f"  Negative (label=0): {np.sum(y == 0):,} frames")
    print(f"  Tỉ lệ pos/neg:    {np.sum(y==1)/len(y)*100:.1f}% / {np.sum(y==0)/len(y)*100:.1f}%")
    print(f"{'=' * 60}")

    # Lưu file
    np.save(EMBEDDINGS_FILE, X)
    np.save(LABELS_FILE, y)
    print(f"\n💾 Đã lưu: {EMBEDDINGS_FILE}")
    print(f"💾 Đã lưu: {LABELS_FILE}")
    print(f"\n✅ Hoàn tất! Tiếp theo chạy: python src/train.py")


if __name__ == "__main__":
    process_all_data(use_augmentation=True)
PYEOF
```

### File 4/6: build_model.py — Xây dựng classifier

```bash
cat > viettune-ai-training/src/build_model.py << 'PYEOF'
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

import tensorflow as tf
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import EMBEDDING_DIM, LEARNING_RATE, BEST_MODEL_PATH, EARLY_STOPPING_PATIENCE


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

        # Output: 1 neuron + sigmoid
        # Sigmoid: f(x) = 1/(1+e^(-x)) → output trong [0.0, 1.0]
        # > 0.5 → "là đàn bầu"
        # ≤ 0.5 → "không phải đàn bầu"
        tf.keras.layers.Dense(1, activation="sigmoid", name="output"),
    ])

    model.compile(
        # Binary crossentropy: loss cho 2 classes
        # Đo "khoảng cách" giữa prediction và ground truth
        loss="binary_crossentropy",

        # Adam: optimizer phổ biến nhất, tự điều chỉnh LR mỗi param
        optimizer=tf.keras.optimizers.Adam(learning_rate=LEARNING_RATE),

        # Metrics: theo dõi trong quá trình train
        metrics=[
            "accuracy",
            tf.keras.metrics.Precision(name="precision"),
            tf.keras.metrics.Recall(name="recall"),
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
PYEOF
```

### File 5/6: train.py — Training loop + đánh giá

```bash
cat > viettune-ai-training/src/train.py << 'PYEOF'
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
import matplotlib
matplotlib.use("Agg")  # Backend không cần GUI (chạy trên server/Colab OK)
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import (
    EMBEDDINGS_FILE, LABELS_FILE, TEST_SIZE, RANDOM_SEED,
    BATCH_SIZE, EPOCHS, TRAINING_HISTORY_PLOT, CLASS_NAMES,
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
    if not os.path.exists(EMBEDDINGS_FILE) or not os.path.exists(LABELS_FILE):
        print("❌ Chưa có processed data!")
        print("   Chạy trước: python src/extract_embeddings.py")
        sys.exit(1)

    print("Đang load processed data...")
    X = np.load(EMBEDDINGS_FILE)
    y = np.load(LABELS_FILE)
    print(f"  Embeddings: {X.shape}")
    print(f"  Labels:     {y.shape}")
    print(f"  Positive:   {np.sum(y == 1):,}")
    print(f"  Negative:   {np.sum(y == 0):,}")
    return X, y


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


def evaluate(model, X_test, y_test):
    """
    Đánh giá model trên test set.

    In ra:
    - Classification report (precision, recall, f1 cho mỗi class)
    - Confusion matrix
    - Test accuracy tổng
    """
    y_pred_prob = model.predict(X_test, verbose=0).flatten()
    y_pred = (y_pred_prob > 0.5).astype(int)

    print(f"\n{'=' * 60}")
    print("ĐÁNH GIÁ TRÊN TEST SET")
    print(f"{'=' * 60}")
    print(classification_report(y_test, y_pred, target_names=CLASS_NAMES))

    cm = confusion_matrix(y_test, y_pred)
    print("Confusion Matrix:")
    print(f"                    Predicted")
    print(f"                    Neg      Pos")
    print(f"  Actual Neg        {cm[0][0]:<8} {cm[0][1]:<8}")
    print(f"  Actual Pos        {cm[1][0]:<8} {cm[1][1]:<8}")

    loss, acc, prec, rec = model.evaluate(X_test, y_test, verbose=0)
    print(f"\n  Test Accuracy:  {acc:.4f} ({acc*100:.1f}%)")
    print(f"  Test Precision: {prec:.4f}")
    print(f"  Test Recall:    {rec:.4f}")
    print(f"  Test Loss:      {loss:.4f}")


def main():
    """Main training flow."""
    # 1. Load data
    X, y = load_processed_data()

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
    evaluate(model, X_test, y_test)

    print(f"\n✅ Training hoàn tất!")
    print(f"   Model tốt nhất: {os.path.basename(EMBEDDINGS_FILE)}")
    print(f"   Tiếp theo chạy: python src/export_onnx.py")


if __name__ == "__main__":
    main()
PYEOF
```

### File 6/6: export_onnx.py — Export model sang ONNX cho C#

```bash
cat > viettune-ai-training/src/export_onnx.py << 'PYEOF'
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
import tensorflow as tf
import tf2onnx
import onnx
import onnxruntime as ort
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import BEST_MODEL_PATH, ONNX_MODEL_PATH, EMBEDDING_DIM


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
    # 4. Lưu file
    # ========================================
    onnx.save(onnx_model, ONNX_MODEL_PATH)
    size_mb = os.path.getsize(ONNX_MODEL_PATH) / (1024 * 1024)
    print(f"\n💾 Đã lưu: {ONNX_MODEL_PATH}")
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
    print(f"\nCopy file này vào project .NET:")
    print(f"  cp {ONNX_MODEL_PATH} /path/to/dotnet-project/Models/")
    print(f"\nCài NuGet trong project .NET:")
    print(f"  dotnet add package Microsoft.ML.OnnxRuntime")
    print(f"\nC# inference code:")
    print(f"""
    var session = new InferenceSession("Models/instrument_detector.onnx");
    var tensor = new DenseTensor<float>(embedding, new[] {{ 1, 1024 }});
    var inputs = new List<NamedOnnxValue> {{
        NamedOnnxValue.CreateFromTensor("embedding_input", tensor)
    }};
    var result = session.Run(inputs);
    var score = result.First().AsEnumerable<float>().First();
    // score > 0.5 → là nhạc cụ mục tiêu
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
PYEOF
```

---

## PHẦN 4: TẠO FILE README

```bash
cat > viettune-ai-training/README.md << 'EOF'
# VietTune AI Training — YAMNet Fine-tune Nhận Diện Nhạc Cụ

## Yêu Cầu Hệ Thống

- Python 3.10 hoặc 3.11 (TensorFlow 2.15 chưa hỗ trợ 3.12+)
- RAM: tối thiểu 8GB
- GPU: KHÔNG bắt buộc (CPU đủ cho pipeline này)
- Disk: ~2GB (cho dependencies + model cache)

## Cài Đặt

```bash
python -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate         # Windows
pip install --upgrade pip
pip install -r requirements.txt
```

## Chuẩn Bị Data

Đặt file audio (.wav khuyến nghị) vào:

```
data/raw/dan_bau/           ← File chứa tiếng đàn bầu (solo hoặc chủ đạo)
data/raw/not_dan_bau/       ← File khác (nhạc cụ khác, giọng hát, tiếng ồn...)
```

Yêu cầu tối thiểu: 5 file mỗi class, mỗi file 1-3 phút.

## Chạy Pipeline

```bash
# Bước 1: Extract YAMNet embeddings (~5-10 phút)
python src/extract_embeddings.py

# Bước 2: Train classifier (~2-5 phút)
python src/train.py

# Bước 3: Export sang ONNX (~30 giây)
python src/export_onnx.py
```

## Kết Quả

- `models/best_model.keras`          — Keras model (dùng trong Python)
- `models/instrument_detector.onnx`  — ONNX model (dùng trong C#/.NET)
- `models/training_history.png`      — Biểu đồ training

## Đổi Nhạc Cụ Mục Tiêu

Sửa `TARGET_INSTRUMENT` trong `src/config.py` và đổi tên thư mục data tương ứng.
EOF
```

---

## PHẦN 5: TẠO FILE .gitignore

```bash
cat > viettune-ai-training/.gitignore << 'EOF'
# Python
venv/
__pycache__/
*.pyc
.eggs/

# Data files (quá lớn cho git)
data/raw/**/*.wav
data/raw/**/*.mp3
data/raw/**/*.flac
data/processed/*.npy

# Models (quá lớn cho git)
models/*.keras
models/*.onnx
models/*.h5

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# TensorFlow Hub cache
/tmp/tfhub_modules/
EOF
```

---

## PHẦN 6: VERIFY CẤU TRÚC

```bash
# Kiểm tra cấu trúc đã tạo đúng chưa
find viettune-ai-training -type f | sort
```

Kết quả mong đợi:

```
viettune-ai-training/.gitignore
viettune-ai-training/README.md
viettune-ai-training/requirements.txt
viettune-ai-training/src/build_model.py
viettune-ai-training/src/config.py
viettune-ai-training/src/export_onnx.py
viettune-ai-training/src/extract_embeddings.py
viettune-ai-training/src/preprocess.py
viettune-ai-training/src/train.py
```

---

## TÓM TẮT FLOW SỬ DỤNG

```
1. Tạo project      → Chạy PHẦN 1-5 (chỉ 1 lần)
2. Thêm audio files → Copy .wav vào data/raw/dan_bau/ và not_dan_bau/
3. Extract          → python src/extract_embeddings.py
4. Train            → python src/train.py
5. Export           → python src/export_onnx.py
6. Deploy           → Copy models/instrument_detector.onnx vào project .NET
```
