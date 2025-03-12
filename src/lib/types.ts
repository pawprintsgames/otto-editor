export type Note = {
	beat: number;
	length: number;
	y: number;
	steps?: Step[];
};

type Step = {
	beat: number;
	y: number;
};

export interface NoteProcessed extends Note {
	beat: number;
	length: number;
	x: number;
	y: number;
	width: number;
	d: string;
	steps?: Step[];
	color?: string;
	yOriginal: number;
}

export type DifficultyName = 'easy' | 'hard' | 'very-hard';

export type Song = {
	gameVersion: string;
	name: string;
	file: string;
	'file-no-melody': string;
	'file-editor': string;
	'beats-per-minute': number;
	difficulty: {
		[key in DifficultyName]: {
			notes: Note[];
			intensity: number;
		};
	};
	tutorial?: unknown;
	waveform?: {
		max: number;
		values: number[];
	};
	length: number;
	scoreboard_id?: string;
};

export type EditorModeProps = {
	beatLength: number;
	trackWidth: number;
	trackHeight: number;
	selectedNotes: Note[];
	cursorDown: boolean;
	altKey: boolean;
	shiftKey: boolean;
	pxToData: (x: number, y: number) => { beat: number; y: number };
	normaliseCoords: (x: number, y: number) => { x: number; y: number };
	setCursor: (x: number) => void;
	pixelRatio: number;
};
