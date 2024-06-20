# Copyright © 2024 Carson. All rights reserved.

import pyaudio
import numpy as np
import matplotlib.pyplot as plt

# Set recording parameters
chunk_size = 256  # Number of audio samples read at a time
sample_rate = 1000  # Sampling rate (number of samples per second)

# Initialize PyAudio
audio = pyaudio.PyAudio()

# Start recording
stream = audio.open(format=pyaudio.paInt16, channels=1, rate=sample_rate, input=True, frames_per_buffer=chunk_size)

# Plot waveform
def plot_waveform(audio_data):
    time = np.arange(0, len(audio_data)) * (1.0 / sample_rate)
    plt.plot(time, audio_data)
    plt.xlabel('Time (s)')
    plt.ylabel('Amplitude')
    plt.title('Waveform')
    plt.show()

# Main program
while True:
    input("Press Enter to start recording, press Ctrl+C to stop the program...")
    audio_data = np.frombuffer(stream.read(chunk_size), dtype=np.int16)
    plot_waveform(audio_data)

# Stop recording and clean up resources
stream.stop_stream()
stream.close()
audio.terminate()