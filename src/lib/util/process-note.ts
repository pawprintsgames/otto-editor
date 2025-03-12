import type { Note, NoteProcessed } from '$lib/types';

export function processNote(
	note: Note,
	beatLength: number,
	trackHeight: number,
	selectedNotes: Note[] = []
): NoteProcessed {
	const x = note.beat * beatLength;
	const y = (note.y || 0.5) * trackHeight;
	const width = note.length ? note.length * beatLength : 0;
	let d = `M ${x},${y} L${x + width},${y}`;
	if (note.steps) {
		d =
			'M ' +
			note.steps
				.map((step) => {
					const x = (note.beat + step.beat) * beatLength;
					const y = step.y * trackHeight;
					return `${x},${y}`;
				})
				.join(' L');
		if (d.includes('NaN')) {
			console.error(`Data invalid: ${d}`);
		}
	}
	const color = selectedNotes.includes(note) ? 'var(--selection)' : 'var(--text-main)';
	return {
		...note,
		x,
		y,
		width,
		d,
		color,
		yOriginal: note.y
	};
}
