<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	const dispatch = createEventDispatcher();

	import ToolbarWrapper from '$lib/layout/toolbar-wrapper.svelte';
	import FileLoader from './dialogs/file-loader.svelte';
	import AudioLoader from './dialogs/audio-loader.svelte';
	import NewFile from './dialogs/new-file.svelte';
	import ExportPackage from './dialogs/export-package.svelte';

	import { notes } from '$lib/stores';

	import type { DifficultyName, Song } from '../lib/types';
	import { LATEST_GAME_VERSION } from '$lib/util/migrate';
	import type Joi from 'joi';

	export let songLoaded = false;

	export let bpm: number = 0;
	let _bpm = bpm;
	$: bpm = Math.max(Math.min(_bpm, 300), 30);
	export let scaleNotesWithBpm = false;
	export let fileWithMelody: Song['file'];
	export let fileNoMelody: Song['file-no-melody'];
	export let difficulty: DifficultyName = 'easy';
	export let difficulties: Song['difficulty'];

	let openMenu: null | 'File' | 'Metadata' | 'Difficulty' | 'View' | 'Help' = null;
	const setMenu = function (menu: typeof openMenu) {
		if (openMenu !== menu) {
			openMenu = menu;
		} else {
			openMenu = null;
		}
	};
	const updateMenu = function (menu: typeof openMenu) {
		if (openMenu && openMenu !== menu) {
			openMenu = menu;
		}
	};

	// close menus when clicking elsewhere on page
	onMount(() => {
		document.addEventListener(
			'click',
			(ev) => {
				if (
					!(ev.target as HTMLElement).closest('.popover-panel') &&
					!(ev.target as HTMLElement).closest('.file-toolbar')
				) {
					setMenu(null);
				}
			},
			true
		);
	});

	const availableDifficulties = [
		'easy',
		'hard',
		'very-hard'
	] satisfies (keyof Song['difficulty'])[];
	$: difficultyDetails = difficulties
		? {
				easy: {
					notes: difficulties.easy.notes.length
				},
				hard: {
					notes: difficulties.hard.notes.length
				},
				['very-hard']: {
					notes: difficulties['very-hard'].notes.length
				}
			}
		: { easy: { notes: 0 }, hard: { notes: 0 }, 'very-hard': { notes: 0 } };
	$: if (difficultyDetails[difficulty]) {
		difficultyDetails[difficulty].notes = $notes.length;
	}

	export let songName: string = '';
	export let audioFileEditor: string = '';
	export let filename: string;

	export let download: Song | null = null;
	export let validDownload: Joi.ValidationResult;

	export let beatLength = 60;

	let newFileDialogOpen = false;
	let fileLoaderOpen = false;
	let audioSelectOpen = false;
	let exportPackageOpen = false;

	async function loadDebugFile() {
		const file: Song = {
			gameVersion: LATEST_GAME_VERSION,
			name: 'test',
			'file-editor': 'Blue_Slushie_-_Full.wav',
			file: '',
			'file-no-melody': '',
			'beats-per-minute': 160,
			length: 0,
			difficulty: {
				easy: {
					notes: [],
					intensity: 1
				},
				hard: {
					notes: [],
					intensity: 1
				},
				'very-hard': {
					notes: [],
					intensity: 1
				}
			}
		};
		const blob = await (await fetch(file['file-editor'])).blob();
		dispatch('fileChange', {
			fileData: file,
			audioFileURL: URL.createObjectURL(blob)
		});
	}

	const difficultyLookup = {
		easy: 'Casual',
		hard: 'Hard',
		'very-hard': 'Extreme'
	};
</script>

<ToolbarWrapper className="file-toolbar">
	<div class="editor-title">
		<img src="otto.png" class="otto-icon" alt="" />
		Otto Editor
	</div>

	<div class="toolbar-menu-item">
		<button
			class="toolbar-menu-button"
			class:active={openMenu === 'File'}
			on:click={() => setMenu('File')}
			on:mousemove={() => updateMenu('File')}>File</button
		>

		{#if openMenu === 'File'}
			<div class="popover-panel">
				<button
					on:click={() => {
						newFileDialogOpen = true;
						setMenu(null);
					}}
				>
					New file...
				</button>

				<button
					on:click={() => {
						fileLoaderOpen = true;
						setMenu(null);
					}}
				>
					Import file...
				</button>

				{#if songLoaded}
					<button
						on:click={() => {
							audioSelectOpen = true;
							setMenu(null);
						}}
					>
						Change audio file...
					</button>
					<hr />

					{#if validDownload.error}
						<p>🙅 File looks invalid. Proceed with caution.</p>
						<blockquote class="warning">{validDownload.error}</blockquote>
					{/if}

					{#if !fileWithMelody}
						<p>
							⚠️ Make sure you’ve set 'Audio file (with melody)' in the Metadata panel, or your song
							will not work in the game.
						</p>
					{/if}

					<a
						role="button"
						download={`${filename}.json`}
						href={`data:text/plain;charset=utf-8,${encodeURIComponent(JSON.stringify(download))}`}
						style="font-weight: normal;"
					>
						<button>Download a copy </button>
					</a>

					<button
						on:click={() => {
							exportPackageOpen = true;
							setMenu(null);
						}}
						disabled
					>
						Download <code>.otto</code> bundle...
						<span style="font-size: 80%; font-style: italic; margin-left: 10px;">(Coming soon)</span
						>
					</button>
				{/if}
			</div>
		{/if}
	</div>

	{#if songLoaded}
		<div class="toolbar-menu-item">
			<button
				class="toolbar-menu-button"
				class:active={openMenu === 'Metadata'}
				on:click={() => setMenu('Metadata')}
				on:mousemove={() => updateMenu('Metadata')}>Metadata</button
			>

			{#if openMenu === 'Metadata'}
				<div class="popover-panel">
					<div>
						<label>
							Song name
							<input type="text" bind:value={songName} />
						</label>
					</div>
					<br />
					<div>
						<label>BPM <input type="number" bind:value={_bpm} /></label>
						{#if bpm !== _bpm}
							<p>Must be greater than 30 and less than 300.</p>
						{/if}
					</div>
					<div>
						<label>
							<input type="checkbox" bind:checked={scaleNotesWithBpm} />
							Move notes with BPM
						</label>
					</div>
					<br />
					<div>
						<label
							><strong>Audio file (with melody)</strong>
							<input type="text" bind:value={fileWithMelody} /></label
						>
						<p class="info">
							The audio file that plays by default, e.g. 'My Song - Melody.wav'. Required.
						</p>
					</div>
					<br />
					<div>
						<label
							><strong>Audio file (no melody)</strong>
							<input type="text" bind:value={fileNoMelody} /></label
						>
						<p class="info">
							The audio file that plays when players miss notes, e.g. 'My Song - Accomp.wav' If not
							set, the game will use a muffled version of the melody file instead.
						</p>
					</div>
					{#if audioFileEditor}
						<div>
							<p>The name of the audio file being used for editing is '{audioFileEditor}'</p>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<div class="toolbar-menu-item">
			<button
				class="toolbar-menu-button"
				class:active={openMenu === 'Difficulty'}
				on:click={() => setMenu('Difficulty')}
				on:mousemove={() => updateMenu('Difficulty')}
				>Difficulty ({difficultyLookup[difficulty]})</button
			>

			{#if openMenu === 'Difficulty'}
				<div class="popover-panel">
					<h3 style="margin-top: 0;">Difficulty level</h3>
					<p>Each difficulty level has a unique set of notes.</p>

					<div class="button-group">
						{#each availableDifficulties as diff, i}
							{@const active = difficulty === diff}
							{@const noteCount = difficultyDetails?.[diff]?.notes}
							<button on:click={() => (difficulty = diff)} class:active>
								{difficultyLookup[diff]}
								<small>
									{#if noteCount}
										({difficultyDetails[diff]?.notes} notes)
									{:else}
										(no notes yet)
									{/if}
								</small>
							</button>
						{/each}
					</div>

					<div>
						<h3 style="margin-top: 30px;">Intensity</h3>
						<p>The relative challenge compared to other '{difficultyLookup[difficulty]}' levels.</p>

						<div class="button-group">
							{#each [1, 2, 3] as intensity, i}
								{@const active = difficulties[difficulty].intensity === intensity}
								<button
									on:click={() => (difficulties[difficulty].intensity = intensity)}
									class:active
								>
									{#each { length: intensity } as _, i}
										<span class="pepper">🌶️</span>
									{/each}
								</button>
							{/each}
						</div>
					</div>
				</div>
			{/if}
		</div>

		<div class="toolbar-menu-item">
			<button
				class="toolbar-menu-button"
				class:active={openMenu === 'View'}
				on:click={() => setMenu('View')}
				on:mousemove={() => updateMenu('View')}>View</button
			>

			{#if openMenu === 'View'}
				<div class="popover-panel">
					<div>
						<label>
							Zoom level
							<input type="range" bind:value={beatLength} width="500px" min="10" max="300" />
						</label>
						<button
							style="margin-top: 20px; width: max-content; display: block;"
							disabled={Math.round(beatLength) === 60}
							on:click={() => (beatLength = 60)}>Reset zoom</button
						>
					</div>
				</div>
			{/if}
		</div>

		<div class="toolbar-menu-item">
			<button
				class="toolbar-menu-button"
				class:active={openMenu === 'Help'}
				on:click={() => setMenu('Help')}
				on:mousemove={() => updateMenu('Help')}>Help</button
			>
			{#if openMenu === 'Help'}
				<div class="popover-panel-wrapper">
					<div class="popover-panel" style="right: 0;">
						<p>
							Find a guide to using this tool on <a href="https://pawprints.itch.io/otto-editor"
								>the homepage</a
							>.
						</p>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</ToolbarWrapper>

<NewFile bind:isOpen={newFileDialogOpen} on:fileChange />

<FileLoader bind:isOpen={fileLoaderOpen} on:fileChange />

<AudioLoader bind:isOpen={audioSelectOpen} on:fileChange audioFileName={audioFileEditor} />

<ExportPackage bind:isOpen={exportPackageOpen} {songName} filedata={download} />

{#if !songLoaded}
	<div class="welcome">
		<p>
			Welcome to <strong>Otto Editor</strong>, the level editor for
			<strong>Otto’s Galactic Groove!!</strong>
		</p>
		<p>
			Use the <strong>File</strong> menu to create a new level or import an existing file, or read on
			for helpful resources.
		</p>
		<ul>
			<li>
				Read the <a href="https://itch.io/board/4509125/otto-editor-manual" target="_top"
					>Otto Editor manual</a
				>
			</li>
			<!-- <li>
				Watch a <a href="#" target="_top">video tutorial</a>
			</li> -->
			<li>
				Contribute to the <a href="https://github.com/pawprintsgames/otto-editor" target="_top"
					>source code on GitHub</a
				>
			</li>
			<li>
				Learn more about <a href="https://play.date/games/ottos-galactic-groove/" target="_top"
					>Otto’s Galactic Groove!!</a
				>
			</li>
		</ul>
	</div>
{/if}

{#if !songLoaded && globalThis?.location?.origin.includes('local')}
	<button on:click={loadDebugFile} style="height: 30vh;">Quick Debug</button>
{/if}

<style>
	button {
		width: 100%;
		text-align: left;
		padding: 14px;
	}
	button + button,
	a + button {
		border-top: none;
	}

	hr {
		margin: 20px 0;
		border: 1px solid var(--border);
	}

	label,
	input[type='text'] {
		width: 100%;
	}

	.editor-title {
		font-weight: bold;
		margin: 0 20px 0 10px;
		filter: opacity(0.8);
		white-space: nowrap;
		user-select: none;
	}

	.otto-icon {
		vertical-align: middle;
		justify-self: center;
		margin: 0 auto;
		height: 50px;
		aspect-ratio: 1;
		color: var(--text-muted);
		filter: contrast(0.4);
		@media (prefers-color-scheme: dark) {
			filter: invert(1);
		}
	}

	.welcome {
		padding: 20px;
		ul {
			list-style-type: disc;
			padding-left: 1.5em;
			margin-top: 10px;
		}
		li {
			margin-bottom: 5px;
			font-size: var(--font-size-small);
		}
	}

	p {
		font-size: var(--font-size-small);
		margin: 10px 0;
	}
	p + p {
		margin-bottom: 0px;
	}

	a {
		color: var(--selection);
		font-weight: bold;
		&:hover {
			text-decoration: underline;
		}
	}

	blockquote.warning {
		border-left: 4px solid indianred;
		padding-left: 10px;
		font-size: var(--font-size-small);
		margin-left: 0;
		font-family: monospace;
		color: #777;
	}

	.popover-panel {
		background-color: var(--background);
		position: absolute;
		z-index: 200;
		padding: 20px;
		min-width: 300px;
		max-width: 400px;
		width: max-content;
		border: 2px solid var(--border);
		box-shadow: var(--border-shadow) 2px 2px 0;
		margin-top: 5px;
	}

	.toolbar-menu-item {
		position: relative;
	}
	.toolbar-menu-button {
		padding: 12px 24px;
	}
	.toolbar-menu-item + .toolbar-menu-item .toolbar-menu-button {
		border-left: none;
	}

	.toolbar-menu-button.active {
		background: var(--background-alt);
		color: var(--text-bright);
	}

	@media (prefers-color-scheme: dark) {
		.pepper {
			filter: hue-rotate(100deg) brightness(1.5);
		}
	}
</style>
