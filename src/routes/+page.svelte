<script lang="ts">
	import '../app.css';

	import Editor from '../components/editor.svelte';
	import Toolbar from '../components/file-toolbar.svelte';

	import { notes } from '$lib/stores';
	import type { DifficultyName, Song } from '../lib/types';
	import type { JsonWaveformData } from 'waveform-data';
	import { validateSong } from '$lib/util/validate-song';

	let song: Song | null = null;
	let songFileName = '';
	let audioFile: string;
	let waveform: JsonWaveformData['data'] | null = null;
	let length = 0;

	let difficulty: DifficultyName = 'easy';
	let beatLength = 60;

	// Adjust note position when BPM changes
	// if scaleNotesWithBpm is true
	let scaleNotesWithBpm = false;
	let prevBpm: number | null = null;

	$: if (song && scaleNotesWithBpm) {
		if (prevBpm && prevBpm !== song['beats-per-minute']) {
			const multiple = song['beats-per-minute'] / prevBpm;
			const difficulties: DifficultyName[] = ['easy', 'hard', 'very-hard'];
			difficulties.forEach((difficulty) => {
				if (song) {
					song.difficulty[difficulty].notes.forEach((note) => {
						note.beat *= multiple;
						note.length *= multiple;
						if (note.steps) {
							note.steps?.forEach((step) => {
								step.beat *= multiple;
							});
							note.steps = note.steps;
						}
					});
					song.difficulty[difficulty].notes = song.difficulty[difficulty].notes;
				}
			});
			$notes = song.difficulty[difficulty].notes;
		}
		prevBpm = song['beats-per-minute'];
	}

	// @ts-ignore-next-line

	let prevDifficulty: DifficultyName | null = difficulty;
	$: if (difficulty && difficulty !== prevDifficulty && song) {
		if (!song.difficulty[difficulty]) {
			difficulty = (Object.keys(song.difficulty)[0] || 'easy') as DifficultyName;
		}
		if (prevDifficulty !== null) {
			// @ts-ignore-next-line
			song.difficulty[prevDifficulty].notes = JSON.parse(JSON.stringify($notes));
		}
		$notes = song?.difficulty?.[difficulty]?.notes || [];
		prevDifficulty = difficulty;
	}

	let notesSorted: any[];
	$: {
		notesSorted = JSON.parse(JSON.stringify($notes));
		notesSorted.sort((a, b) => a.beat - b.beat);
	}

	// Export song waveform data for a background visualization.
	// Currently unused due to performance limitations on the Playdate hardware.
	const INCLUDE_WAVEFORM = false;
	$: if (INCLUDE_WAVEFORM && song && waveform) {
		const values = waveform.filter((d, i) => i % 2).map(Math.abs);
		song.waveform = {
			max: Math.max(...values.map(Math.abs)),
			values
		};
	}
	$: if (song && length) {
		song.length = length;
	}

	const handle_keydown = (e: KeyboardEvent) => {
		if (e.metaKey && e.which === 90) {
			e.preventDefault();
			// undo();
			// (e.shiftKey ? redo : undo)();
		}
	};

	$: download = song && {
		...song,
		difficulty: {
			...song.difficulty,
			[difficulty]: {
				...song.difficulty[difficulty],
				notes: $notes
			}
		}
	};

	function handleFileChange(event: {
		detail: { audioFileURL: string; fileData?: Song; audioFileName?: string; fileName: string };
	}) {
		const { fileData, audioFileURL, audioFileName, fileName } = event.detail;
		if (fileData) {
			song = fileData;
			songFileName = fileName;
			prevDifficulty = null;
		}
		if (song && audioFileName) {
			song['file-editor'] = audioFileName;
		}
		audioFile = audioFileURL;
		prevBpm = null;
	}
</script>

<!-- <link rel="stylesheet" href="./water.css" /> -->

<svelte:window on:keydown={handle_keydown} />

{#if song}
	<Toolbar
		bind:bpm={song['beats-per-minute']}
		bind:scaleNotesWithBpm
		bind:difficulty
		bind:songName={song.name}
		bind:beatLength
		audioFileEditor={song['file-editor']}
		bind:fileWithMelody={song.file}
		bind:fileNoMelody={song['file-no-melody']}
		{download}
		validDownload={validateSong(download)}
		filename={songFileName || song.name}
		on:fileChange={handleFileChange}
		songLoaded={!!song}
		difficulties={song.difficulty}
	/>

	<Editor bpm={song['beats-per-minute']} {audioFile} {beatLength} bind:waveform bind:length />
{:else}
	<Toolbar on:fileChange={handleFileChange} songLoaded={!!song} />

	<!-- <div class="recently-edited-songs">
    Recently edited songs TK
  </div> -->
{/if}

<!-- <div style="margin-top: 100px;">
  <p>Notes: {$notes.length} <button on:click={() => $notes = []}>Clear</button></p>
  <textarea  style="width: 100%; height: 400px;" readonly>{JSON.stringify(notesSorted, null, '  ')}</textarea>
</div> -->
<style global>
	:global(*) {
		box-sizing: border-box;
	}
	/* :global(button[aria-expanded="true"]) {
    background: var(--background-alt);
  } */
	.popover-panel label:has(input[type='text']),
	.popover-panel label:has(input[type='range']) {
		font-size: var(--font-size-small);
		text-transform: uppercase;
	}

	.popover-panel label:has(input[type='checkbox']) {
		margin-top: 20px;
	}

	.recently-edited-songs {
		padding: 20px;
	}
</style>
