<div class="toolbar-section"><slot /></div>

<style>
	.toolbar-section {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-shrink: 0;
	}
	:global(.toolbar-section + .toolbar-section) {
		padding-left: 10px;
	}
</style>
