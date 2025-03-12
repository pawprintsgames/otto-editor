<script lang="ts">
	import { notes } from '$lib/stores';
	import type { EditorModeProps, Note } from '$lib/types';
	import NoteComponent from '../note.svelte';
	import { processNote } from '$lib/util/process-note';

	let {
		beatLength,
		trackWidth,
		trackHeight,
		selectedNotes = $bindable([]),
		cursorDown,
		pxToData
	}: EditorModeProps = $props();

	let notesProcessed = $derived(
		$notes.map((note) => {
			return processNote(note, beatLength, trackHeight, selectedNotes);
		})
	);
	let noteSteps = $derived(
		notesProcessed.map((n) => {
			const note = processNote(n, beatLength, trackHeight, selectedNotes);
			return (
				note.steps?.map((step) => {
					const x = (note.beat + step.beat) * beatLength;
					const y = step.y * trackHeight;
					return { x, y };
				}) || []
			);
		})
	);

	interface MouseEvent {
		layerX: number;
		layerY: number;
		clientX: number;
		clientY: number;
	}

	let selectedNote: Note | null = $state(null);
	let stepIndex: number | null = $state(null);
	let stepModified = $state(false);
	function onStepMouseDown(noteIndex: number, _stepIndex: number) {
		return function () {
			selectedNote = $notes[noteIndex];
			stepIndex = _stepIndex;
		};
	}
	function onMouseMove(event?: { original: MouseEvent }) {
		if (!event || !cursorDown || !selectedNote || stepIndex === null || !selectedNote.steps) {
			return;
		}
		// move step
		const { beat, y } = pxToData(event.original.layerX, event.original.layerY);

		selectedNote.steps[stepIndex] = {
			beat: beat - selectedNote.beat,
			y
		};
		stepModified = true;
		if (stepIndex === 0) {
			const prevBeat = selectedNote.beat;
			selectedNote.beat = beat;
			selectedNote.y = y;
			selectedNote.steps.forEach((s, i) => {
				if (i > 0) {
					s.beat += prevBeat - beat;
				}
			});
		}
		const step = selectedNote.steps[stepIndex];
		selectedNote.steps.sort((a, b) => a.beat - b.beat);
		stepIndex = selectedNote.steps.indexOf(step);
		selectedNote.length = (selectedNote.steps || []).at(-1)?.beat || 0;
		$notes = $notes;
	}
	function onMouseDownNote(event: { noteIndex: number; original: MouseEvent }) {
		const { beat, y } = pxToData(event.original.layerX, event.original.layerY);
		selectedNote = $notes[event.noteIndex] as Note;
		if (!selectedNote.steps) {
			selectedNote.steps = [];
		}
		const step = {
			beat: beat - selectedNote.beat,
			y
		};
		selectedNote.steps.push(step);
		selectedNote.steps.sort((a, b) => a.beat - b.beat);
		stepIndex = selectedNote.steps.findIndex((s) => s.beat === step.beat);
		$notes = $notes;
		stepModified = true;
	}

	// remove steps if clicked on
	$effect(() => {
		if (cursorDown === false) {
			if (
				!stepModified &&
				selectedNote &&
				stepIndex !== null &&
				stepIndex !== 0 &&
				selectedNote.steps &&
				selectedNote.steps.length > 2
			) {
				selectedNote.steps = selectedNote.steps?.filter((step, i) => i !== stepIndex);
				$notes = $notes;
			}
			selectedNote = null;
			stepIndex = null;
			stepModified = false;
		}
	});
</script>

<rect
	x="0"
	y="0"
	width={trackWidth}
	height={trackHeight}
	fill="rgba(0,0,0,0.01)"
	onmousemove={(ev) => onMouseMove({ original: ev })}
	aria-hidden="true"
></rect>

<g class="notes">
	{#each notesProcessed as note, index}
		<NoteComponent
			{note}
			{index}
			color={note.color}
			size={trackHeight / 12}
			onmousedown={onMouseDownNote}
			onmousemove={onMouseMove}
			cursor="crosshair"
		/>
	{/each}
	{#each noteSteps as steps, index}
		<g class="steps">
			{#each steps as step, stepIndex}
				<g
					class="step"
					transform={`translate(${step.x}, ${step.y})`}
					onmousemove={() => onMouseMove()}
					aria-hidden="true"
				>
					<circle class="step-handle" r="2" fill="#f417e5" />
					<line
						y1={-trackHeight / 12}
						y2={trackHeight / 12}
						stroke-width="2"
						stroke="var(--selection)"
					/>
					<rect
						x="-5"
						y={-trackHeight / 12}
						width="10"
						height={trackHeight / 6}
						opacity="0.001"
						onmousedown={onStepMouseDown(index, stepIndex)}
						aria-hidden="true"
						style:cursor="move"
					></rect>
					{#if stepIndex > 0}
						<text class="y-pos-label" dx="-10" dy="5">
							{(step.y / 400).toFixed(3)}
						</text>
					{/if}
				</g>
			{/each}
		</g>
	{/each}
</g>

<style>
	.step:hover .step-handle {
		transform: scale(2);
	}
	.y-pos-label {
		fill: var(--selection);
		text-anchor: end;
		font-size: 12px;
		font-family: monospace;
		pointer-events: none;
		user-select: none;
		-webkit-user-select: none;
		stroke: var(--background);
		paint-order: stroke;
		stroke-width: 3px;
	}
</style>
