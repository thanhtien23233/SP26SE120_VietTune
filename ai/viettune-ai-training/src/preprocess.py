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
