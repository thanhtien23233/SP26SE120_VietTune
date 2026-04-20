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
    CLASS_NAMES_FILE,
    CLASS_NAMES,
    NUM_CLASSES,
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


def process_directory(model, directory: str, label_idx: int,
                      class_name: str, use_augmentation: bool = True) -> tuple:
    """
    Xử lý tất cả file audio trong 1 thư mục class.
    """
    all_embeddings = []
    all_labels = []

    audio_files = get_all_audio_files(directory)
    print(f"\n📁 Thư mục: {directory}")
    print(f"   Class: {class_name} (Index: {label_idx})")
    print(f"   Tìm thấy {len(audio_files)} file audio")

    if len(audio_files) == 0:
        print(f"   ⚠️ CẢNH BÁO: Không tìm thấy file audio nào trong {directory}!")
        return all_embeddings, all_labels

    for i, fpath in enumerate(audio_files):
        fname = os.path.basename(fpath)
        print(f"\n   [{i+1}/{len(audio_files)}] {fname}")

        waveform = load_audio(fpath)
        waveform = normalize_audio(waveform)
        duration = len(waveform) / 16000
        print(f"      Thời lượng: {duration:.1f}s ({len(waveform):,} samples)")

        emb = extract_embeddings_from_waveform(model, waveform)
        n = emb.shape[0]
        print(f"      → {n} frames (gốc)")

        all_embeddings.append(emb)
        all_labels.extend([label_idx] * n)

        if use_augmentation:
            aug_names = ["noise", "pitch_up", "pitch_down", "speed_up"]
            aug_waveforms = augment_waveform(waveform)

            for j, (aug_wav, aug_name) in enumerate(zip(aug_waveforms, aug_names)):
                aug_emb = extract_embeddings_from_waveform(model, aug_wav)
                aug_n = aug_emb.shape[0]
                print(f"      → {aug_n} frames (augment: {aug_name})")

                all_embeddings.append(aug_emb)
                all_labels.extend([label_idx] * aug_n)

    return all_embeddings, all_labels


def process_all_data(use_augmentation: bool = True):
    if NUM_CLASSES < 2:
        print(f"❌ CẦN ÍT NHẤT 2 CLASSES. HIỆN TẠI TÌM THẤY {NUM_CLASSES}: {CLASS_NAMES}")
        return

    yamnet = load_yamnet()

    all_emb_total = []
    all_labels_total = []

    for class_idx, class_name in enumerate(CLASS_NAMES):
        class_dir = os.path.join(RAW_DIR, class_name)
        emb, labels = process_directory(yamnet, class_dir, class_idx, class_name, use_augmentation)
        all_emb_total.extend(emb)
        all_labels_total.extend(labels)

    if len(all_emb_total) == 0:
        print("\n❌ KHÔNG CÓ DATA! Hãy đặt file audio vào các thư mục tương ứng.")
        return

    X = np.vstack(all_emb_total)             # (total_frames, 1024)
    y = np.array(all_labels_total, dtype=np.int32)  # (total_frames,)

    # In tổng kết
    print(f"\n{'=' * 60}")
    print(f"TỔNG KẾT EXTRACT EMBEDDINGS")
    print(f"{'=' * 60}")
    print(f"  Tổng frames:       {X.shape[0]:,}")
    print(f"  Embedding dim:     {X.shape[1]}")
    for class_idx, class_name in enumerate(CLASS_NAMES):
        n_frames = np.sum(y == class_idx)
        print(f"  Class '{class_name}': {n_frames:,} frames ({n_frames/len(y)*100:.1f}%)")
    print(f"{'=' * 60}")

    # Lưu file
    np.save(EMBEDDINGS_FILE, X)
    np.save(LABELS_FILE, y)
    
    with open(CLASS_NAMES_FILE, "w", encoding="utf-8") as f:
        for name in CLASS_NAMES:
            f.write(name + "\n")
            
    print(f"\n💾 Đã lưu: {EMBEDDINGS_FILE}")
    print(f"💾 Đã lưu: {LABELS_FILE}")
    print(f"💾 Đã lưu: {CLASS_NAMES_FILE}")
    print(f"\n✅ Hoàn tất! Tiếp theo chạy: python src/train.py")


if __name__ == "__main__":
    process_all_data(use_augmentation=True)
