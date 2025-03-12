<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		style,
		open = $bindable(false),
		children
	}: { style?: string; open: boolean; children?: Snippet } = $props();

	function onKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			open = false;
		}
	}

	let domNode: HTMLDialogElement;

	$effect(() => {
		if (domNode) {
			if (open) {
				domNode.showModal();
			} else {
				domNode.close();
			}
		}
	});
</script>

<dialog {style} bind:this={domNode}>
	{@render children?.()}
	<button
		class="close"
		onclick={() => {
			open = false;
		}}
	>
		✕
	</button>
</dialog>

<svelte:window on:keydown={onKeyDown} />

<style>
	dialog {
		position: fixed;
		width: 400px;
		left: 0;
		top: 0;
		box-shadow: var(--border-shadow) 2px 2px 0;
		z-index: 400;
		background-color: var(--background);
		border: 2px solid var(--border);
		padding: 20px;
	}

	.close {
		position: absolute;
		top: 20px;
		right: 20px;
		width: 30px;
		height: 30px;
		padding: 0;
		box-sizing: content-box;
	}
</style>
