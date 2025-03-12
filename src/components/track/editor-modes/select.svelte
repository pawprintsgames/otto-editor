<script lang="ts">
	import { notes } from '$lib/stores';
	import type { EditorModeProps } from '$lib/types';
	import NoteComponent from '../note.svelte';
	import { processNote } from '$lib/util/process-note';

	let {
		beatLength,
		trackWidth,
		trackHeight,
		selectedNotes = $bindable([]),
		cursorDown,
		altKey,
		pxToData,
		normaliseCoords,
		setCursor,
		pixelRatio
	}: EditorModeProps = $props();

	let copying = $state(false);
	let draggingNote = $state(false);
	let selectBox = $state({
		visible: false,
		x1: 0,
		y1: 0,
		x2: 0,
		y2: 0
	});
	let prevCursorPos = $state({
		beat: 0,
		y: 0
	});

	let notesProcessed = $derived(
		$notes.map((note) => {
			return processNote(note, beatLength, trackHeight, selectedNotes);
		})
	);

	interface MouseEvent {
		layerX: number;
		layerY: number;
		clientX: number;
		clientY: number;
	}

	function onMouseMove(event: { original: MouseEvent }) {
		if (cursorDown && selectBox.visible) {
			// adjust selectBox

			const { x: cursorX, y: cursorY } = normaliseCoords(
				event.original.layerX,
				event.original.layerY * pixelRatio
			);

			selectBox.x1 = cursorX;
			selectBox.y2 = cursorY;
			selectBox.visible = true;
			copying = false;

			const { x1, x2, y1, y2 } = selectBox;
			const extents = {
				x: x2 > x1 ? [x1, x2] : [x2, x1],
				y: y2 > y1 ? [y1, y2] : [y2, y1]
			};
			selectedNotes = $notes.filter((note) => {
				const noteX = note.beat * beatLength;
				const noteY = (note.y ?? 0) * trackHeight;
				return (
					noteX + note.length * beatLength >= extents.x[0] &&
					noteX <= extents.x[1] &&
					noteY >= extents.y[0] &&
					noteY <= extents.y[1]
				);
			});
		} else if (selectedNotes.length && cursorDown && draggingNote) {
			// drag notes around track

			const { beat, y } = pxToData(event.original.clientX, event.original.layerY / pixelRatio);

			const offset = {
				beat: beat - prevCursorPos.beat,
				y: (y - prevCursorPos.y) * pixelRatio
			};

			if (copying) {
				selectedNotes = JSON.parse(JSON.stringify(selectedNotes));
				$notes = [...$notes, ...selectedNotes];
				copying = false;
			}

			selectedNotes.forEach((note) => {
				note.beat = note.beat + offset.beat;
				if (note.y !== undefined) {
					note.y = note.y + offset.y;
				}
				if (note.steps !== undefined) {
					note.steps.forEach((step) => {
						step.y = step.y + offset.y;
					});
				}
			});

			$notes = $notes;

			if (cursorDown) {
				prevCursorPos = { beat, y };
			}
		}
	}
	function onMouseDownNote(event: { noteIndex: number; original: MouseEvent }) {
		// select single note
		draggingNote = true;
		copying = altKey;
		if (selectedNotes.includes($notes[event.noteIndex]) === false) {
			selectedNotes = [$notes[event.noteIndex]];
		}
		prevCursorPos = pxToData(event.original.clientX, event.original.layerY / pixelRatio);
	}
	function onMouseDownTrack(event: MouseEvent) {
		selectedNotes = [];
		$notes = $notes;

		const { x: cursorX, y: cursorY } = normaliseCoords(event.layerX, event.layerY);

		selectBox = {
			visible: true,
			x1: cursorX,
			y1: event.layerY,
			x2: cursorX,
			y2: event.layerY
		};
		copying = false;

		const smallBox = selectBox.x1 - selectBox.x2 + selectBox.y1 - selectBox.y2 < 8;
		if (cursorDown && selectedNotes.length === 0 && smallBox) {
			setCursor(cursorX);
		}
	}

	$effect(() => {
		if (cursorDown === false) {
			draggingNote = false;
			selectBox = {
				visible: false,
				x1: 0,
				y1: 0,
				x2: 0,
				y2: 0
			};
			copying = false;
			prevCursorPos = {
				beat: 0,
				y: 0
			};
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
	onmousedown={onMouseDownTrack}
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
			cursor={altKey ? 'copy' : ''}
		/>
	{/each}
</g>

{#if selectBox.visible}
	<rect
		class="select-box"
		x={`${Math.min(selectBox.x1, selectBox.x2)}px`}
		width={`${Math.abs(selectBox.x2 - selectBox.x1)}px`}
		y={`${Math.min(selectBox.y1, selectBox.y2)}px`}
		height={`${Math.abs(selectBox.y2 - selectBox.y1)}px`}
		stroke="var(--text-bright)"
		fill="var(--text-bright)"
		fill-opacity="0.2"
	/>
{/if}

<style>
	.select-box {
		pointer-events: none;
	}
</style>
