<script lang="ts">
	import Dialog from '$lib/layout/Dialog.svelte';
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	export let isOpen = false;
	export let audioFileName: string;

	let audioFileInputNode: HTMLInputElement;
	let audioFile: File | undefined;
	let audioFileURL: string;

	$: if (audioFile) {
		audioFileURL = URL.createObjectURL(audioFile);
	}

	function onFileInput() {
		if (audioFileInputNode?.files) {
			audioFile = audioFileInputNode.files[0];
		}
	}

	function confirmFile() {
		if (!audioFile) {
			return;
		}
		dispatch('fileChange', { audioFileURL, audioFileName: audioFile.name });
		audioFile = undefined;
		isOpen = false;
	}
</script>

<Dialog bind:open={isOpen}>
	<h3>Switch audio file for editing</h3>

	<p>MP3 format recommended. Current file is <strong>{audioFileName}</strong>.</p>

	<input type="file" bind:this={audioFileInputNode} on:input={onFileInput} />

	<p>
		Note: This file is not necessarily the one that plays in-game. To set that file, go to the
		'Metadata' menu.
	</p>

	<p>
		<button class="fullwidth" disabled={!audioFile} on:click={confirmFile}>Switch audio</button>
	</p>
</Dialog>

<style>
	p {
		margin: 10px 0;
	}
</style>
