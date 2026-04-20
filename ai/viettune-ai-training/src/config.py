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
def detect_classes(raw_dir):
    if not os.path.exists(raw_dir):
        return []
    classes = [d for d in os.listdir(raw_dir)
               if os.path.isdir(os.path.join(raw_dir, d)) and not d.startswith('.')]
    return sorted(classes)

CLASS_NAMES = detect_classes(RAW_DIR)
NUM_CLASSES = len(CLASS_NAMES)

print(f"Detected {NUM_CLASSES} classes: {CLASS_NAMES}")

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
CLASS_NAMES_FILE = os.path.join(PROCESSED_DIR, "class_names.txt")
BEST_MODEL_PATH = os.path.join(MODELS_DIR, "best_model.keras")
ONNX_MODEL_PATH = os.path.join(MODELS_DIR, "instrument_detector.onnx")
TRAINING_HISTORY_PLOT = os.path.join(MODELS_DIR, "training_history.png")
