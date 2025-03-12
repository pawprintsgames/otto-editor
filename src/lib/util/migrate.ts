import type { Song } from '$lib/types';

export function migrate(song: Song): Song {
	const newSong = structuredClone(song);
	Object.keys(migrations).forEach((version) => {
		if (migrations[version]) {
			migrations[version](newSong);
			newSong.gameVersion = version;
		}
	});
	return newSong;
}

export const LATEST_GAME_VERSION = 'beta-2024-12-20';

const migrations: Record<string, (song: Song) => void> = {};

migrations['alpha-07-01-2024'] = function (song: Song) {
	// Add new very-hard difficulty
	if (!song.difficulty['very-hard']) {
		song.difficulty['very-hard'] = {
			notes: [],
			intensity: 1
		};
	}
	// Add intensity rating to song
	Object.values(song.difficulty).forEach((diff) => {
		diff.intensity = 1;
	});
};

migrations['beta-2024-12-20'] = function (song: Song) {
	if (!song.length) {
		song.length = 0;
	}
};
