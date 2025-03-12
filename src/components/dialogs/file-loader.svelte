<script lang="ts">
	import { validateSong } from '$lib/util/validate-song';
	import { createEventDispatcher } from 'svelte';
	import type { Song } from '../../lib/types';
	import { migrate } from '$lib/util/migrate';
	import Dialog from '$lib/layout/Dialog.svelte';
	const dispatch = createEventDispatcher();

	export let isOpen = false;

	let files: FileList | undefined;

	let fileData: Song | null;
	let fileName = '';

	$: if (files && files.length > 0) {
		const file = files[0];
		const reader = new FileReader();
		reader.onload = (event) => {
			if (event.target && typeof event.target.result === 'string') {
				try {
					fileData = JSON.parse(event.target.result);
					if (fileData !== null) {
						fileData = migrate(fileData);
						fileName = file.name.split('.')[0];
						invalidFile = (validateSong(fileData).error || '') as string;
					} else {
						throw new Error('File data has value `null`.');
					}
				} catch (err) {
					invalidFile = `Does not appear to be a valid JSON file. ${err}`;
				}
			}
		};
		reader.readAsText(file);
	}

	let jsonFileInputNode: HTMLInputElement;
	let invalidFile = '';

	let audioFileInputNode: HTMLInputElement;
	let audioFile: File | undefined;
	let audioFileURL: string;

	$: if (audioFile) {
		audioFileURL = URL.createObjectURL(audioFile);
	}

	function confirmFile() {
		if (!fileData) {
			return;
		}
		if (audioFile) {
			fileData['file-editor'] = audioFile.name;
		}
		dispatch('fileChange', { fileData, fileName, audioFileURL });
		files = undefined;
		audioFile = undefined;
		isOpen = false;
	}
</script>

<Dialog bind:open={isOpen}>
	<h3>Load a file</h3>

	<p>Select an existing song file from your computer.</p>
	<p>
		<input
			type="file"
			bind:this={jsonFileInputNode}
			on:input={(event) => {
				if (jsonFileInputNode?.files) {
					files = jsonFileInputNode.files;
				}
			}}
		/>
	</p>

	{#if files && files[0]}
		{#if invalidFile}
			<p>🙅 File looks invalid. Proceed with caution.</p>
			<blockquote>{invalidFile}</blockquote>
		{:else}
			<p>✅ File is valid!</p>
		{/if}

		<p>Now select the matching audio file for editing.</p>

		{#if fileData && fileData['file-editor']}
			<p>Expecting file <strong>{fileData['file-editor']}</strong>.</p>
		{/if}

		<input
			type="file"
			bind:this={audioFileInputNode}
			on:input={() => {
				if (audioFileInputNode.files && audioFileInputNode.files.length) {
					audioFile = audioFileInputNode.files[0];
				}
			}}
		/>
	{/if}
	<p>
		<button class="fullwidth" disabled={!audioFile} on:click={confirmFile}> Load file </button>
	</p>
</Dialog>

<style>
	p {
		margin: 10px 0;
	}

	blockquote {
		border-left: 4px solid indianred;
		padding-left: 10px;
		font-size: var(--font-size-small);
		margin-left: 0;
		font-family: monospace;
		color: #777;
	}
</style>
