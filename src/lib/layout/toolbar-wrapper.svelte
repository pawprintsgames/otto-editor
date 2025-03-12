<script lang="ts">
	export let inset = false;
	export let className = '';
</script>

<div class="toolbar {className}" class:inset><slot /></div>

<style>
	.toolbar {
		display: flex;
		padding: 10px;
		align-items: center;
		width: auto;
		gap: 4px;
	}
	.inset {
		gap: 10px;
		padding-left: 10px;
		border-top: 1px solid var(--border);
	}
</style>
