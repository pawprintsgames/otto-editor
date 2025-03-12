<script lang="ts">
	import { onMount } from 'svelte';
	import WaveCanvas from './wave-canvas.svelte';

	export let peaks: number[];
	export let percent: number;
	export let color = 'grey';
	export let progressColor = '#eee';
	export let height = 40;
	export let barWidth = 0;
	let containerWidth;
	let waveWidth;
	let waveHeight;
	export let pixelRatio: number;
</script>

<div
	on:click
	on:mousemove
	bind:clientWidth={containerWidth}
	aria-hidden="true"
	id="wave-wrapper"
	style="position: relative;
          width: 100%;
          height: 100%;
          "
>
	<WaveCanvas
		{peaks}
		{barWidth}
		{color}
		canvasWidth={containerWidth * pixelRatio}
		canvasHeight={height * pixelRatio}
		{pixelRatio}
	/>
</div>

<style>
	.progress-wave-wrapper {
		position: absolute;
		z-index: 2;
		left: 0;
		top: 0;
		bottom: 0;
		overflow: hidden;
		/* height: 200px; */
		/* width: ({progressWidth})px; */
		display: block;
		transition: width 200ms ease-in-out;
		box-sizing: border-box;
	}
</style>
