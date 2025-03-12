<script lang="ts">
	import Dialog from '$lib/layout/Dialog.svelte';
	import wavToPda from 'wav-pda-converter/dist/wav-to-pda.js';
	import JSZip from 'jszip';

	import type { Song } from '$lib/types';

	let {
		isOpen = $bindable(false),
		songName = '',
		filedata
	} = $props<{
		filedata: Song;
		isOpen: boolean;
		songName: string;
	}>();

	let uploadError = $state('');

	let audioFileInputNode: HTMLInputElement;
	let audioFileInputNodeNomelody: HTMLInputElement;
	let pdaFiles = $state({
		file: '',
		'file-no-melody': ''
	});
	let download = $state('');

	let zip = $derived(new JSZip().folder(songName + '.otto'));
	$effect(() => {
		if (zip && filedata && pdaFiles['file']) {
			const data = JSON.parse(JSON.stringify(filedata));
			data['file'] = filedata['file'] || 'audio.pda';
			const nomelody =
				(!filedata['file-no-melody'] || filedata['file-no-melody'] === filedata['file']) &&
				!pdaFiles['file-no-melody'];
			if (nomelody) {
				data['file-no-melody'] = data['file'];
			} else {
				data['file-no-melody'] = data['file-no-melody'] || 'audio-nomelody.pda';
			}
			zip.file(`${data['file'].replace('.wav', '.pda')}`, pdaFiles['file'], { base64: true });
			if (pdaFiles['file-no-melody']) {
				zip.file(`${data['file-no-melody'].replace('.wav', '.pda')}`, pdaFiles['file-no-melody'], {
					base64: true
				});
			}
			zip.file('data.json', JSON.stringify(data));
			zip.generateAsync({ type: 'base64' }).then(function (base64) {
				download = 'data:application/zip;base64,' + base64;
			});
		}
	});

	async function onFileChange() {
		uploadError = '';
		const file = audioFileInputNode?.files?.[0];
		const fileNomelody = audioFileInputNodeNomelody?.files?.[0];
		if (file) {
			convertFile(file)
				.then((pda) => {
					pdaFiles['file'] = pda;
				})
				.catch((error) => {
					console.error(error);
					uploadError = error as string;
				});
		}
		if (fileNomelody) {
			convertFile(fileNomelody)
				.then((pda) => {
					pdaFiles['file-no-melody'] = pda;
				})
				.catch((error) => {
					console.error(error);
					uploadError = error as string;
				});
		}
	}

	async function convertFile(file: FileList[0]) {
		const arrayBuffer = await file.arrayBuffer();
		const buffer = new Uint8Array(arrayBuffer);

		const pda = wavToPda.wavToPda(buffer);
		return pda.toString('base64');
	}
</script>

<Dialog bind:open={isOpen}>
	<h3>Download level package</h3>

	<p>Download level data along with PDA files as a <code>.otto</code> file.</p>

	<p style="margin-top: 1.5em;">
		Select a WAV file for the main audio (mono ADPCM encoding format recommended).
	</p>

	<input type="file" bind:this={audioFileInputNode} onchange={onFileChange} />

	<p style="margin-top: 1.5em;">Optionally, select a WAV file without a melody.</p>
	<input type="file" bind:this={audioFileInputNodeNomelody} onchange={onFileChange} />

	{#if uploadError}
		<p>{uploadError}</p>
	{/if}

	<p>
		<a href={download} download={songName + '.otto.zip'} role="button">
			<button class="fullwidth">Download</button>
		</a>
	</p>
</Dialog>

<style>
	p {
		margin: 10px 0;
	}
</style>
