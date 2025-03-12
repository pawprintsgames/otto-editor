<script lang="ts">
	import Dialog from '$lib/layout/Dialog.svelte';
	import { createEventDispatcher } from 'svelte';
	import type { Song } from '../../lib/types';
	import { LATEST_GAME_VERSION } from '$lib/util/migrate';
	const dispatch = createEventDispatcher();

	export let isOpen = false;

	let name = '';
	let audioFileName = '';
	let bpm = 60;

	let audioFile: File | undefined;
	let audioFileURL: string;

	$: if (audioFile) {
		audioFileURL = URL.createObjectURL(audioFile);
	}

	function getBlankFile(name: string, audioFile: File, bpm: number) {
		const file: Song = {
			gameVersion: LATEST_GAME_VERSION,
			name,
			file: '',
			'file-no-melody': '',
			'file-editor': audioFile?.name || '',
			'beats-per-minute': bpm,
			length: 0,
			difficulty: {
				easy: {
					notes: [],
					intensity: 1
				},
				hard: {
					notes: [],
					intensity: 1
				},
				'very-hard': {
					notes: [],
					intensity: 1
				}
			}
		};
		return file;
	}

	function onFileInput(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length) {
			audioFile = target.files[0];
		}
	}

	function confirmFile() {
		if (audioFile) {
			dispatch('fileChange', {
				fileData: getBlankFile(name, audioFile, bpm),
				audioFileURL
			});
			name = '';
			audioFileName = '';
			audioFile = undefined;
			isOpen = false;
		}
	}
</script>

<Dialog bind:open={isOpen}>
	<h3>Create a new file</h3>

	<p>
		<label>
			<span>Song name</span>
			<input type="text" bind:value={name} />
		</label>
	</p>

	<p>
		<label>
			<span>Beats per minute</span>
			<input type="number" bind:value={bpm} />
		</label>
	</p>

	<p>
		<label>
			Audio file for editing (MP3 recommended):
			<br />
			<input type="file" on:input={onFileInput} />
		</label>
	</p>

	<p>
		<button class="fullwidth" on:click={confirmFile} disabled={!(name && audioFile)}>
			Create
		</button>
	</p>
</Dialog>

<style>
	p {
		margin: 10px 0;
	}
	label span {
		display: inline-block;
		width: 40%;
	}
</style>
