<script lang="ts">
	import { currentTime } from '$lib/stores';
	import type { NoteProcessed } from '$lib/types';
	import type { MouseEventHandler } from 'svelte/elements';

	let {
		note,
		index = -1,
		color = 'var(--text-main)',
		size = 10,
		cursor = '',
		onmousedown,
		onmousemove
	}: {
		note: NoteProcessed;
		index?: number;
		color?: string;
		size?: number;
		cursor?: string;
		onmousedown?: (event: { noteIndex: number; original: MouseEvent }) => void;
		onmousemove?: (event: { noteIndex: number; original: MouseEvent }) => void;
	} = $props();

	let passed = $derived(note.beat < $currentTime.beats);
	let scale = $derived(passed ? 1.5 : 1);
</script>

<g
	class="note"
	class:passed
	data-index={index}
	onmousedown={(event) => onmousedown?.({ noteIndex: index, original: event })}
	onmousemove={(event) => onmousemove?.({ noteIndex: index, original: event })}
	aria-hidden="true"
>
	<path
		d={note.d}
		stroke={color}
		stroke-width={size}
		stroke-linecap="round"
		stroke-linejoin="round"
		fill="none"
	/>
	<path
		class="note-inner"
		class:passed
		d={note.d}
		stroke="var(--background)"
		stroke-width={size * 0.75}
		stroke-linecap="round"
		stroke-linejoin="round"
		fill="none"
	/>
	<circle class="note" cx={note.x} cy={note.y} r={size * 0.175 * scale} fill={color} />
	<path
		class="note-select-bounds"
		d={note.d}
		stroke="rgba(0,0,0,0)"
		stroke-width={size * 2}
		stroke-linecap="round"
		stroke-linejoin="round"
		fill="none"
		style:cursor
	/>
	<text class="y-pos-label" x={note.x} y={note.y} dx="-20" dy="5">
		{note.yOriginal.toFixed(3)}
	</text>
</g>

<style>
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
