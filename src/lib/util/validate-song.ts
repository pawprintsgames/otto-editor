import Joi from 'joi';
import type { Song } from '$lib/types';

const notesSchema = Joi.array().items(
	Joi.object({
		beat: Joi.number().required(),
		y: Joi.number().required(),
		length: Joi.number(),
		steps: Joi.array()
			.items(
				Joi.object({
					beat: Joi.number().required(),
					y: Joi.number().required()
				})
			)
			.min(2)
	})
);
const intensitySchema = Joi.number().required().min(1).max(3);
const difficultySchema = Joi.object().keys({
	easy: Joi.object({
		notes: notesSchema,
		intensity: intensitySchema
	}),
	hard: Joi.object({
		notes: notesSchema,
		intensity: intensitySchema
	}),
	'very-hard': Joi.object({
		notes: notesSchema,
		intensity: intensitySchema
	})
});

const tutorialSchema = Joi.object().keys({
	text: Joi.array().items(
		Joi.object({
			start: Joi.number().required(),
			finish: Joi.number().required(),
			text: Joi.string(),
			textRetry: Joi.string()
		}).unknown(true)
	),
	sections: Joi.array().items(
		Joi.object({
			start: Joi.number().required(),
			finish: Joi.number().required(),
			fixedY: Joi.number(),
			crankIndicator: Joi.boolean()
		})
	)
});
const schema = Joi.object({
	gameVersion: Joi.string().required(),
	name: Joi.string().required(),
	file: Joi.string().required().allow(''),
	'file-no-melody': Joi.string().required().allow(''),
	'file-editor': Joi.string().optional(),
	'beats-per-minute': Joi.number().required(),
	difficulty: difficultySchema.required(),
	tutorial: tutorialSchema,
	waveform: Joi.object({
		max: Joi.number().required(),
		values: Joi.array().items(Joi.number()).required()
	}).optional(),
	length: Joi.number().required(),
	scoreboard_id: Joi.string()
});

/**
 * Attempt to fix common errors
 */
function fixSong(songFile: any) {
	const song = structuredClone(songFile) as Song;
	Object.entries(song.difficulty).forEach(([diffName, diff]) => {
		const newNotes = diff.notes;
		newNotes.forEach((note) => {
			if (note.length === null) {
				note.length = 0;
			}
			note.steps = note.steps?.filter((step) => {
				step.beat === null || step.y === null;
			});
			if (note.steps && note.steps.length < 2) {
				delete note.steps;
			}
		});
		song.difficulty[diffName as keyof Song['difficulty']].notes = newNotes;
	});

	return song;
}

export function validateSong(songFile: any) {
	try {
		songFile = fixSong(songFile);
	} catch (error) {
		// never mind
	}
	return schema.validate(songFile);
}
