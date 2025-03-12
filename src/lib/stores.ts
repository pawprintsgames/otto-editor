import { readable, writable } from 'svelte/store';
import type { Note } from '$lib/types';

function createNotes() {
	let notesStore = writable<Note[]>([]);

	let noteHistory: Note[][] = [];
	let noteFuture: Note[][] = [];

	function setNotes(newNotes: Note[], addToHistory = true, resetFuture = true) {
		if (addToHistory) {
			const clonedNotes = JSON.parse(JSON.stringify(newNotes)) as Note[];
			if (areSimilar(newNotes, noteHistory.at(-1) || []) && noteHistory.length) {
				noteHistory[noteHistory.length - 1] = clonedNotes;
			} else {
				noteHistory.push(clonedNotes);
			}
		}
		notesStore.set(newNotes);
		if (resetFuture) {
			noteFuture = [];
		}
	}

	return {
		subscribe: notesStore.subscribe,
		set: setNotes,
		undo: () => {
			if (noteHistory.length > 0) {
				const last = noteHistory.pop() || [];
				setNotes(last, false, false);
				if (last.length) {
					const lastCloned = JSON.parse(JSON.stringify(last)) as Note[];
					noteFuture.push(lastCloned);
				}
			} else {
				// console.log(noteHistory, 'no more history')
			}
		},
		redo: () => {
			if (noteFuture.length > 0) {
				const next = noteFuture.pop() || [];
				setNotes(next, true, false);
			} else {
				// console.log(noteFuture, 'no more future')
			}
		},
		getHistoryStatus: () => {
			return {
				canUndo: noteHistory.length > 0,
				canRedo: noteFuture.length > 0
			};
		}
	};
}

function areSimilar(a: Note[], b: Note[]) {
	return (
		a.length +
			a.reduce((n, note) => n + (note.steps?.length || 0), 0) -
			(b.length + b.reduce((n, note) => n + (note.steps?.length || 0), 0)) ===
		0
	);
}

export const notes = createNotes();
export const currentTime = writable({ seconds: 0, beats: 0 });
