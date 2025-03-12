import WaveformData from 'waveform-data';
import type { JsonWaveformData, WaveformDataFromAudioCallback } from 'waveform-data';

export async function generateWaveform(audiofile: string, scale = 128): Promise<JsonWaveformData> {
	const audioContext = new AudioContext();

	const response = await fetch(audiofile);
	const buffer = await response.arrayBuffer();
	const options = {
		audio_context: audioContext,
		array_buffer: buffer,
		scale,
		bits: 8
	};

	const waveform: any = await new Promise((resolve, reject) => {
		WaveformData.createFromAudio(options, (err, waveform) => {
			if (err) {
				reject(err);
			} else {
				resolve(waveform);
			}
		});
	});
	return waveform.toJSON();
}
