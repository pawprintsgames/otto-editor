<script lang="ts">
	// https://github.com/Catsvilles/svelte-audio-waveform
	import { onMount, beforeUpdate, afterUpdate } from 'svelte';
	import canvasSize from 'canvas-size/dist/canvas-size.esm.js';

	let canv: HTMLCanvasElement;
	export let canvasWidth: number;
	export let canvasHeight: number;
	export let color: string;
	export let barWidth: number;
	export let peaks: any[];
	export let pixelRatio: number;

	const absMaxf = (values: number[]): number => {
		let max = -Infinity;
		for (const i in values) {
			const num = Math.abs(values[i]);
			if (num > max) {
				max = num;
			}
		}

		return max;
	};

	const maxf = (values: number[]): number => {
		let max = -Infinity;
		for (const i in values) {
			if (values[i] > max) {
				max = values[i];
			}
		}

		return max;
	};

	const minf = (values: number[]): number => {
		let min = +Infinity;
		for (const i in values) {
			if (values[i] < min) {
				min = values[i];
			}
		}

		return min;
	};

	const drawBars = (ctx: CanvasRenderingContext2D, width: number, peaks: any[]) => {
		const params = {
			fillParent: true,
			height: canvasHeight,
			normalize: true,
			pixelRatio: pixelRatio,
			barWidth: barWidth,
			color: color
		};
		// Bar wave draws the bottom only as a reflection of the top,
		// so we don't need negative values
		const hasMinVals = [].some.call(peaks, (val) => val < 0);
		if (hasMinVals) {
			// If the first value is negative, add 1 to the filtered indices
			let indexOffset = 0;
			if (peaks[0] < 0) {
				indexOffset = 1;
			}
			peaks = [].filter.call(peaks, (_, index) => (index + indexOffset) % 2 == 0);
		}

		// A half-pixel offset makes lines crisp
		const pr = 0.5 / params.pixelRatio;
		const height = params.height * params.pixelRatio;
		const offsetY = 0;
		const halfH = params.height / 2; // Don't use height because this is after canvas height has been set
		const length = peaks.length;
		const bar = params.barWidth * params.pixelRatio;
		const gap = Math.max(params.pixelRatio, 2);
		const step = bar + gap;

		let absmax = 1;
		if (params.normalize) {
			absmax = absMaxf(peaks);
		}

		const scale = length / width;

		//TODO if something, there is gradient color option
		// if (params.gradientColors) {
		//   const gradient = ctx.createLinearGradient(0, 0, width, 0)
		//   params.gradientColors.forEach((color) => {
		//     // The first position of each array is the stop position between 0 and 1
		//     // The second position is the color
		//     gradient.addColorStop(color[0], color[1])
		//   })
		//   ctx.fillStyle = gradient
		// } else {
		//   ctx.fillStyle = params.color
		// }

		ctx.fillStyle = params.color;

		if (!ctx) {
			return;
		}

		for (let i = 0; i < width; i += step) {
			let h = Math.round((peaks[Math.floor(i * scale)] / absmax) * halfH);
			if (h === 0) {
				h = 1;
			}
			ctx.fillRect(i + pr, halfH - h + offsetY, bar + pr, h * 2);
		}
	};

	const drawWaves = (ctx: CanvasRenderingContext2D, width: number, peaks: number[]) => {
		const params = {
			fillParent: true,
			height: canvasHeight,
			normalize: true,
			pixelRatio: pixelRatio,
			color: color
		};

		// Support arrays without negative peaks
		const hasMinValues = [].some.call(peaks, (val) => val < 0);
		if (!hasMinValues) {
			const reflectedPeaks = [];
			for (var i = 0, len = peaks.length; i < len; i++) {
				reflectedPeaks[2 * i] = peaks[i];
				reflectedPeaks[2 * i + 1] = -peaks[i];
			}
			peaks = reflectedPeaks;
		}

		// A half-pixel offset makes lines crisp
		const pr = 0.5 / params.pixelRatio;
		const height = params.height * params.pixelRatio;
		const offsetY = 0;
		const halfH = params.height / 2;
		const length = ~~(peaks.length / 2);

		let scale = 1;
		if (params.fillParent && width != length) {
			scale = width / length;
		}

		let absmax = 1;
		if (params.normalize) {
			const max = maxf(peaks);
			const min = minf(peaks);
			absmax = -min > max ? -min : max;
		}

		//TODO if something, there is gradient color option
		// if (params.gradientColors) {
		//   const gradient = ctx.createLinearGradient(0, 0, width, 0)
		//   params.gradientColors.forEach((color) => {
		//     // The first position of each array is the stop position between 0 and 1
		//     // The second position is the color
		//     gradient.addColorStop(color[0], color[1])
		//   })
		//   ctx.fillStyle = gradient
		// } else {
		//   ctx.fillStyle = params.color
		// }

		ctx.fillStyle = params.color;

		if (!ctx) {
			return;
		}

		ctx.beginPath();
		ctx.moveTo(pr, halfH + offsetY);

		for (var i = 0; i < length; i++) {
			var h = Math.round((peaks[2 * i] / absmax) * halfH);
			ctx.lineTo(i * scale + pr, halfH - h + offsetY);
		}

		// Draw the bottom edge going backwards, to make a single
		// closed hull to fill.
		for (var i = length - 1; i >= 0; i--) {
			var h = Math.round((peaks[2 * i + 1] / absmax) * halfH);
			ctx.lineTo(i * scale + pr, halfH - h + offsetY);
		}

		// ctx.closePath()
		ctx.fill();

		// Always draw a median line
		ctx.fillRect(0, halfH + offsetY - pr, width, pr);
	};

	const clearWave = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
		ctx.clearRect(0, 0, width, height);
	};

	let maxCanvasSize: number;
	canvasSize.maxWidth().then(({ success, width }: { success: boolean; width: number }) => {
		if (success) {
			maxCanvasSize = width;
		} else {
			maxCanvasSize = 25_000;
		}
	});

	const updateSize = (width: number, height: number, peaks: number[]) => {
		if (peaks && canv) {
			/**
			 * If the canvas element is too large, it might crash and appear blank.
			 * So we limit the maximum width, which may cause the waveform to appear blurry
			 * on very high zoom levels (and/or long audio files)
			 */
			width = Math.min(width, maxCanvasSize);

			const ctx = canv.getContext('2d') as CanvasRenderingContext2D;

			const displayHeight = Math.round(height / pixelRatio);
			ctx.canvas.width = width;
			ctx.canvas.height = height;
			ctx.canvas.style.width = `100%`;
			ctx.canvas.style.height = `${displayHeight}px`;

			clearWave(ctx, width, height);
			if (barWidth) {
				drawBars(ctx, width, peaks);
			} else {
				drawWaves(ctx, width, peaks);
			}
		}
	};
	afterUpdate(() => {
		updateSize(canvasWidth, canvasHeight, peaks);
	});

	beforeUpdate(() => {
		if (canvasWidth && maxCanvasSize) {
			updateSize(canvasWidth, canvasHeight, peaks);
		}
	});
</script>

<canvas bind:this={canv}></canvas>
