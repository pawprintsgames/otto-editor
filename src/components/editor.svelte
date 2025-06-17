<script lang="ts">
	import WaveCanvas from './track/wave-canvas.svelte';
	import ToolbarWrapper from '$lib/layout/toolbar-wrapper.svelte';
	import ToolbarSection from '$lib/layout/toolbar-section.svelte';

	import type { Note, NoteProcessed } from '../lib/types';

	import { notes, currentTime } from '$lib/stores';
	import SelectComponent from './track/editor-modes/select.svelte';
	import TweakComponent from './track/editor-modes/tweak.svelte';
	import WriteComponent from './track/editor-modes/write.svelte';
	const cursorComponents = {
		tweak: TweakComponent,
		write: WriteComponent,
		select: SelectComponent
	};

	import { processNote } from '$lib/util/process-note';
	import { generateWaveform } from '$lib/util/generate-waveform';
	import { onMount } from 'svelte';
	import type { JsonWaveformData } from 'waveform-data';

	export let bpm: number;
	export let audioFile: string;
	export let waveform: JsonWaveformData['data'] | null = null;
	export let length: number;

	let colorScheme: 'light' | 'dark' = window.matchMedia('(prefers-color-scheme: dark)').matches
		? 'dark'
		: 'light';

	let audioDecodeError: string | null = null;

	let peaks: number[];
	$: if (audioFile) {
		generateWaveform(audioFile)
			.then((_waveform) => {
				peaks = _waveform.data;
				waveform = _waveform.data;
				audioDecodeError = null;
			})
			.catch((err) => {
				audioDecodeError = err;
			});
	}

	let audio: HTMLAudioElement;
	let time: number = 0;
	let duration: number;
	$: if (duration) {
		length = duration;
	}

	export let beatLength = 60;

	let pixelRatio = 1;
	onMount(() => {
		pixelRatio = window.devicePixelRatio;
		window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
			colorScheme = event.matches ? 'dark' : 'light';
		});
	});
	$: trackWidth = beatLength * totalBeats;
	const trackHeight = 400;

	type CursorMode = 'tweak' | 'write' | 'select';
	let cursorMode: CursorMode = 'select';

	$: cursorModeComponent = cursorComponents[cursorMode];

	let canUndo = false;
	let canRedo = false;
	$: if ($notes) {
		const status = notes.getHistoryStatus();
		canUndo = status.canUndo;
		canRedo = status.canRedo;
	}

	type BackgroundGuide = 'none' | 'waveform' | 'midi';
	let backgroundGuide: BackgroundGuide = 'waveform';

	$: timeInBeats = time * beatsPerSecond;

	$: beatsPerSecond = bpm / 60;
	$: loaded = !!duration;

	let timeInPixels: number;
	let timeInPercent: number;
	let totalBeats: number;

	$: if (loaded) {
		timeInPercent = time / duration;
		timeInPixels = timeInBeats * beatLength;
		totalBeats = duration * beatsPerSecond * pixelRatio;
		$currentTime = { beats: time * beatsPerSecond, seconds: time };
		if (audio && !audio.paused) {
			scrollCursorIntoView();
		}
	}

	let selectBox = {
		visible: false,
		x1: 0,
		x2: 0,
		y1: 0,
		y2: 0,
		draggingNote: false
	};
	let selectedNotes: Note[] = [];
	let pasteboard: Note[] = [];

	let snapNotesX = true;

	type Tick = {
		positionInPixels: number;
		seconds: number;
		beat: number;
	};

	let noteCursorPosition = {
		x: 0,
		y: 0.5
	};

	let ticks: Tick[] = [];
	$: {
		ticks = [];
		for (let step = 1; step < totalBeats; step++) {
			ticks.push({
				positionInPixels: step * beatLength,
				beat: step,
				seconds: step / beatsPerSecond
			});
		}
	}

	let notesProcessed: NoteProcessed[] = [];
	$: {
		notesProcessed = $notes.map((note) => {
			return processNote(note, beatLength, trackHeight, selectedNotes);
		});
	}

	$: _overlappingNotes = notesProcessed
		.map((a) => {
			const start = a.beat;
			const length = (a.steps || []).at(-1)?.beat || a.length || 0;
			const end = start + length;
			const overlappingNote = notesProcessed.find(
				(b) => b !== a && b.beat >= start && b.beat <= end
			);
			if (!overlappingNote) {
				return { overlap: false, start: 0, end: 0 };
			}
			const overlappingNoteLength =
				(overlappingNote?.steps || []).at(-1)?.beat || overlappingNote?.length || 0;
			return {
				overlap: !!overlappingNote,
				start: Math.min(a.x, overlappingNote.x),
				end: Math.max(
					a.x + length * beatLength,
					overlappingNote.x + overlappingNoteLength * beatLength
				)
			};
		})
		.filter(({ overlap }) => overlap);

	let overlappingNotes: typeof _overlappingNotes;
	$: if (cursorDown === false) {
		overlappingNotes = _overlappingNotes;
	}

	function beatToPercent(beat: number): number {
		const seconds = beat / beatsPerSecond;
		return seconds / duration;
	}

	let activeEditingNote: Note;
	let activeEditingNoteModified = false;

	let cursorDown = false;
	let altKey = false;
	let shiftKey = false;

	function normaliseCoords(x: number, y: number): { x: number; y: number } {
		return {
			x,
			y: y / pixelRatio
		};
	}
	function pxToData(x: number, y: number): { beat: number; y: number } {
		const percent = x / trackWidth;
		let beat = percent * totalBeats;
		if (snapNotesX) {
			beat = Math.round(percent * totalBeats * pixelRatio * 2) / (pixelRatio * 2);
		}

		const yRatio = y / trackHeight;
		return {
			beat,
			y: yRatio
		};
	}

	function onWaveformClick() {
		cursorDown = true;
	}
	function onWaveformMove() {}
	function onWaveformMouseUp() {
		cursorDown = false;
	}

	let progessCaretNode: SVGLineElement;
	let trackWrapperNode: HTMLDivElement;
	let loopStartPoint = false;
	let prevStartPoint = 0;
	$: prevStartPointPx = prevStartPoint * beatsPerSecond * beatLength;

	function scrollCursorIntoView() {
		if (trackWrapperNode && progessCaretNode) {
			const trackWidth = trackWrapperNode.offsetWidth;
			const offset = progessCaretNode.getBBox().x / trackWidth;
			const distance = offset * trackWidth;
			const currentScrollX = trackWrapperNode.scrollLeft;
			if (Math.abs(distance - currentScrollX) > trackWidth * 0.9) {
				const left = distance - 100;
				trackWrapperNode.scrollTo({
					left,
					behavior: 'smooth'
				});
			}
		}
	}

	function showMoveNotesDialog() {
		const number = prompt('Move notes to start at beat...');
		if (number !== null && !Number.isNaN(parseFloat(number))) {
			const startBeat = Math.min(...selectedNotes.map((note) => note.beat));
			const move = parseFloat(number) - startBeat;
			selectedNotes.forEach((note) => (note.beat += move));
			selectedNotes = selectedNotes;
		}
	}

	function setCursor(x: number) {
		audio.pause();
		time = duration * (x / trackWidth) * pixelRatio;
		prevStartPoint = time;
	}
</script>

<svelte:window
	on:keydown={(event) => {
		if (document.activeElement !== document.body) {
			return;
		}

		const cmdCtrl = event.metaKey || event.ctrlKey;

		if (event.code === 'Space') {
			event.preventDefault();
			if (audio.paused) {
				audio.play();
				if (loopStartPoint) {
					time = prevStartPoint;
				}
			} else {
				audio.pause();
			}
			event.preventDefault();
			return false;
		}
		if (event.code === 'Backspace') {
			event.preventDefault();
			$notes = $notes.filter((note) => !selectedNotes.includes(note));
			event.preventDefault();
			return false;
		}
		if (event.code === 'KeyA' && !audio.paused) {
			event.preventDefault();
			$notes.push({
				beat: Math.round(timeInBeats),
				y: 0.5,
				length: 0
			});
			$notes = $notes;
			event.preventDefault();
			return false;
		}

		if (event.code === 'KeyC' && cmdCtrl) {
			pasteboard = JSON.parse(JSON.stringify(selectedNotes));
			event.preventDefault();
			return false;
		}
		if (event.code === 'KeyX' && cmdCtrl) {
			pasteboard = JSON.parse(JSON.stringify(selectedNotes));
			$notes = $notes.filter((note) => !selectedNotes.includes(note));
			event.preventDefault();
			return false;
		}
		if (event.code === 'KeyV' && cmdCtrl) {
			$notes = [...$notes, ...pasteboard];
			selectedNotes = pasteboard;
			$notes.sort((a, b) => a.beat - b.beat);
			event.preventDefault();
			return false;
		}
		if (event.code === 'KeyA' && cmdCtrl) {
			selectedNotes = $notes;
			event.preventDefault();
			return false;
		}
		if (
			(event.code === 'KeyZ' && cmdCtrl && event.shiftKey) ||
			(event.code === 'KeyY' && cmdCtrl)
		) {
			notes.redo();
			event.preventDefault();
			return false;
		}
		if (event.code === 'KeyZ' && cmdCtrl) {
			notes.undo();
			event.preventDefault();
			return false;
		}
		if (event.code === 'Enter' && selectedNotes.length > 0) {
			showMoveNotesDialog();
			event.preventDefault();
			return false;
		}

		altKey = event.altKey;
		shiftKey = event.shiftKey;
	}}
	on:keyup={() => {
		altKey = false;
		shiftKey = false;
	}}
/>

{#if audioDecodeError}
	<details style="padding: 20px;">
		<summary>
			Oops! There was a problem loading that audio file. If you're using a WAV file, those can
			sometimes fail to load. In which case you may want to try an MP3 instead.
		</summary>
		<pre style="margin-top: 20px;"><code>{audioDecodeError}</code></pre>
	</details>
{/if}
{#if loaded}
	<ToolbarWrapper inset={true}>
		<ToolbarSection>
			<div class="button-group">
				<button
					on:click={() => (cursorMode = 'select')}
					class="icon-button"
					class:active={cursorMode === 'select'}
				>
					<svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 320 512"
						><!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path
							d="M0 55.2V426c0 12.2 9.9 22 22 22c6.3 0 12.4-2.7 16.6-7.5L121.2 346l58.1 116.3c7.9 15.8 27.1 22.2 42.9 14.3s22.2-27.1 14.3-42.9L179.8 320H297.9c12.2 0 22.1-9.9 22.1-22.1c0-6.3-2.7-12.3-7.4-16.5L38.6 37.9C34.3 34.1 28.9 32 23.2 32C10.4 32 0 42.4 0 55.2z"
						/></svg
					>
				</button>

				<button
					on:click={() => (cursorMode = 'write')}
					class="icon-button"
					class:active={cursorMode === 'write'}
				>
					<svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 512 512"
						><!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path
							d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z"
						/></svg
					>
				</button>

				<button
					on:click={() => (cursorMode = 'tweak')}
					class="icon-button"
					class:active={cursorMode === 'tweak'}
				>
					<svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 640 512"
						><!--! Font Awesome Free 6.4.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path
							d="M320 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160zm156.8-48C462 361 397.4 416 320 416s-142-55-156.8-128H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H163.2C178 151 242.6 96 320 96s142 55 156.8 128H608c17.7 0 32 14.3 32 32s-14.3 32-32 32H476.8z"
						/></svg
					>
				</button>
			</div>
		</ToolbarSection>

		<!--<ToolbarSection>
			<button disabled={!canUndo} on:click={() => notes.undo()} class="icon-button">
				<svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 512 512"
					><path
						d="M48.5 224H40c-13.3 0-24-10.7-24-24V72c0-9.7 5.8-18.5 14.8-22.2s19.3-1.7 26.2 5.2L98.6 96.6c87.6-86.5 228.7-86.2 315.8 1c87.5 87.5 87.5 229.3 0 316.8s-229.3 87.5-316.8 0c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0c62.5 62.5 163.8 62.5 226.3 0s62.5-163.8 0-226.3c-62.2-62.2-162.7-62.5-225.3-1L185 183c6.9 6.9 8.9 17.2 5.2 26.2s-12.5 14.8-22.2 14.8H48.5z"
					/></svg
				>
			</button>
			<button disabled={!canRedo} on:click={() => notes.redo()} class="icon-button">
				<svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 512 512"
					><path
						d="M463.5 224H472c13.3 0 24-10.7 24-24V72c0-9.7-5.8-18.5-14.8-22.2s-19.3-1.7-26.2 5.2L413.4 96.6c-87.6-86.5-228.7-86.2-315.8 1c-87.5 87.5-87.5 229.3 0 316.8s229.3 87.5 316.8 0c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0c-62.5 62.5-163.8 62.5-226.3 0s-62.5-163.8 0-226.3c62.2-62.2 162.7-62.5 225.3-1L327 183c-6.9 6.9-8.9 17.2-5.2 26.2s12.5 14.8 22.2 14.8H463.5z"
					/></svg
				>
			</button>
		</ToolbarSection>-->

		<ToolbarSection>
			<label>
				<input type="checkbox" bind:checked={snapNotesX} />
				Snap to beat
			</label>
			<label>
				<input type="checkbox" bind:checked={loopStartPoint} />
				Loop start point
			</label>
			<button
				class="inline-button"
				on:click={() => showMoveNotesDialog()}
				disabled={selectedNotes.length === 0}
			>
				Move notes...
			</button>
		</ToolbarSection>

		<ToolbarSection>
			<div style="display: flex; gap: 10px; display: none;">
				<audio
					src={audioFile}
					controls
					bind:currentTime={time}
					bind:this={audio}
					style:display={'block'}
					style:height={'20px'}
					on:play={() => (prevStartPoint = time)}
				></audio>
				<div style="flex-shrink: 0;">Beat {timeInBeats.toFixed(1)}</div>
			</div>
		</ToolbarSection>

		<!--<ToolbarSection>
    <label>
      <input type=radio bind:group={backgroundGuide} name="scoops" value={'none'}>
      None
    </label>
    <label>
      <input type=radio bind:group={backgroundGuide} name="scoops" value={'waveform'}>
      Waveform
    </label>
    <label>
      <input type=radio bind:group={backgroundGuide} name="scoops" value={'midi'}>
      Midi
    </label>
  </ToolbarSection>-->
	</ToolbarWrapper>

	<div class="note-track-wrapper" bind:this={trackWrapperNode}>
		<svg class="track-above" width={trackWidth / pixelRatio} height={20}>
			<g class="ticks">
				{#each ticks as tick}
					<text
						class="tick-label"
						x={`${tick.positionInPixels}px`}
						y={10}
						fill={tick.beat % 4 === 0 ? 'var(--text-bright)' : 'var(--text-muted)'}
						text-anchor="middle"
					>
						{tick.beat}
					</text>
				{/each}
			</g>
		</svg>

		<div class="note-track" style:width={trackWidth * pixelRatio}>
			{#if audio}
				<svg
					class={`track ${cursorMode}`}
					class:alt-key={altKey}
					width={trackWidth / pixelRatio}
					height={trackHeight}
					on:pointerdown={onWaveformClick}
					on:pointerup={onWaveformMouseUp}
					on:pointerout={null}
				>
					<g class="ticks-horizontal" transform={`translate(0, 0)`}>
						<line
							x1={0}
							x2={trackWidth}
							y1={0}
							y2={0}
							stroke={'lightgray'}
							stroke-dasharray="1 1"
						/>
						<line
							x1={0}
							x2={trackWidth}
							y1={trackHeight / 2}
							y2={trackHeight / 2}
							stroke={'lightgray'}
							stroke-dasharray="1 1"
						/>
						<line
							x1={0}
							x2={trackWidth}
							y1={trackHeight}
							y2={trackHeight}
							stroke={'lightgray'}
							stroke-dasharray="1 1"
						/>
					</g>

					<g class="ticks">
						{#each ticks as tick}
							<line
								class="tick-line"
								x1={`${tick.positionInPixels}px`}
								x2={`${tick.positionInPixels}px`}
								y1="0"
								y2={trackHeight}
								stroke={tick.beat % 4 === 0 ? 'var(--text-bright)' : 'var(--text-muted)'}
								stroke-dasharray="1 1"
							/>
						{/each}
					</g>

					{#if loopStartPoint}
						<line
							class="progress-caret loop-start-point"
							x1={`${prevStartPointPx}px`}
							x2={`${prevStartPointPx}px`}
							y1={0}
							y2={trackHeight}
							stroke="#f417e5"
							stroke-dasharray="2px 2px"
							stroke-width="4"
						/>
					{/if}

					<g class="overlapping-notes">
						{#each overlappingNotes as overlap}
							<g class="overlap-warning" transform="translate({overlap.start}, 0)">
								<rect
									height={trackHeight}
									width={overlap.end - overlap.start}
									fill="var(--selection)"
									opacity="0.1"
								/>
								<text font-size="13" x={(overlap.end - overlap.start) * 0.5} y="18">OVERLAP</text>
							</g>
						{/each}
					</g>

					<svelte:component
						this={cursorModeComponent}
						{beatLength}
						{trackHeight}
						trackWidth={trackWidth / pixelRatio}
						bind:selectedNotes
						{pxToData}
						{normaliseCoords}
						{cursorDown}
						{altKey}
						{shiftKey}
						{setCursor}
						{pixelRatio}
					/>

					<line
						class="progress-caret"
						x1={`${timeInPixels}px`}
						x2={`${timeInPixels}px`}
						y1={0}
						y2={trackHeight}
						stroke="var(--text-bright)"
						stroke-width="2"
						bind:this={progessCaretNode}
					/>
				</svg>
			{/if}

			{#if backgroundGuide === 'waveform' && duration > 0}
				<div style:padding={0}>
					<WaveCanvas
						{peaks}
						barWidth={0.1}
						color={colorScheme === 'dark' ? 'white' : 'black'}
						canvasWidth={trackWidth}
						canvasHeight={trackHeight * pixelRatio}
						{pixelRatio}
					/>
				</div>
			{/if}
		</div>

		<svg class="track-below" width={trackWidth / pixelRatio} height={20}>
			<g class="ticks">
				{#each ticks as tick}
					<text
						class="tick-label"
						x={`${tick.positionInPixels}px`}
						y={10}
						fill={tick.beat % 4 === 0 ? 'var(--text-bright)' : 'var(--text-muted)'}
						text-anchor="middle"
					>
						{tick.beat}
					</text>
				{/each}
			</g>
		</svg>
	</div>
{:else}
	<div>
		Loading...

		<audio
			src={audioFile}
			controls
			bind:currentTime={time}
			bind:this={audio}
			bind:duration
			style:width={'400px'}
			style:height={'20px'}
		></audio>
	</div>
{/if}

<style>
	.icon-radio {
		vertical-align: middle;
	}
	.inline-button[disabled] {
		opacity: 0.2;
		pointer-events: none;
		padding: 10px;
	}

	.note-track {
		position: relative;
		user-select: none;
	}
	.note-track-wrapper {
		overflow-x: scroll;
		overflow-y: hidden;
		width: 100%;
		margin-top: 10px;
		/* cursor: none; */
	}

	.progress-caret {
		pointer-events: none;
	}
	.note-cursor {
		height: 10px;
		width: 10px;
		margin-top: -5px;
		margin-left: -5px;
		border-radius: 5px;
		opacity: 0.5;
		pointer-events: none;
	}

	.ticks {
		position: relative;
		height: 100px;
		margin-bottom: -100px;
		z-index: -1;
	}
	.tick {
	}
	.tick-label {
		font-family: monospace;
		font-size: 10px;
		user-select: none;
		-webkit-user-select: none;
	}

	.track {
		position: absolute;
		top: 0;
		z-index: 100;
	}
	.track.write {
		cursor: pointer;
	}

	.notes {
		position: relative;
		top: 100px;
		z-index: 100;
	}

	.icon-button {
		width: 42px;
		height: 42px;
		display: grid;
		align-items: center;
		justify-content: center;
		padding: 0;
		margin: 0;
	}
	.icon-button svg {
		fill: var(--text-bright);
	}

	.overlapping-notes {
		fill: var(--selection);
		letter-spacing: 1px;
		text-anchor: middle;
	}

	.button-group {
		display: flex;
		gap: 4px;
		button {
			border: none;
		}
	}
	.icon-button.active {
		background: var(--background-alt);
	}

	label:has(input[type='checkbox']),
	button {
		font-size: var(--font-size-small);
		color: var(--text-main);
		display: flex;
		gap: 8px;
		margin-right: 12px;
	}
</style>
