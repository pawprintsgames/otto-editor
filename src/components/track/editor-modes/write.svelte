<script lang="ts">
	import { notes } from '$lib/stores';
	import type { EditorModeProps, Note, NoteProcessed } from '$lib/types';
	import NoteComponent from '../note.svelte';
	import { processNote } from '$lib/util/process-note';

	let {
		beatLength,
		trackWidth,
		trackHeight,
		selectedNotes = $bindable([]),
		cursorDown,
		shiftKey,
		pxToData,
		normaliseCoords
	}: EditorModeProps = $props();

	let notesProcessed = $derived(
		$notes.map((note) => {
			return processNote(note, beatLength, trackHeight, selectedNotes);
		})
	);

	let activeEditingNote: Note | undefined = $state(undefined);
	let activeEditingNoteModified = $state(false);

	let noteCursorPosition = $state({
		beat: 0,
		y: 0.5
	});

	interface MouseEvent {
		layerX: number;
		layerY: number;
		clientX: number;
		clientY: number;
	}

	function onMouseDown(event: MouseEvent) {
		const { beat, y } = pxToData(event.layerX, event.layerY);

		activeEditingNote = {
			beat,
			y,
			length: 0
		} as Note;

		$notes.push(activeEditingNote);
		$notes = $notes;

		noteCursorPosition.beat = 0;
	}

	function onMouseMove(event: { noteIndex?: number; original: MouseEvent }) {
		const { beat, y: cursorY } = pxToData(event.original.layerX, event.original.layerY);
		const { x: cursorX } = normaliseCoords(event.original.layerX, event.original.layerY);

		if (cursorDown && activeEditingNote) {
			const length = beat - activeEditingNote.beat;
			if (length > 0) {
				activeEditingNote.length = length;
				const straightLine = shiftKey;
				activeEditingNote.steps = [
					{
						beat: 0,
						y: activeEditingNote.y
					},
					{
						beat: length,
						y: straightLine ? activeEditingNote.y : cursorY
					}
				];

				$notes[$notes.length - 1] = activeEditingNote;
			}
			activeEditingNoteModified = true;
			$notes = $notes;
		} else {
			noteCursorPosition = {
				beat,
				y: cursorY
			};
		}
	}
</script>

<rect
	x="0"
	y="0"
	width={trackWidth}
	height={trackHeight}
	fill="rgba(0,0,0,0.01)"
	onmousemove={(ev) => onMouseMove({ original: ev })}
	onmousedown={onMouseDown}
	aria-hidden="true"
></rect>

<g class="notes" style="pointer-events: none;">
	{#each notesProcessed as note, index}
		<NoteComponent {note} {index} color={note.color} size={trackHeight / 12} cursor="crosshair" />
	{/each}
</g>

{#if noteCursorPosition.beat > 0}
	<g class="note-cursor" style="opacity: 0.5; pointer-events: none;" transform={`translate(0, 0)`}>
		<NoteComponent
			note={processNote({ ...noteCursorPosition, length: 0 }, beatLength, trackHeight)}
			size={trackHeight / 12}
		/>
	</g>
{/if}
