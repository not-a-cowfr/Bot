import { AutocompleteInteraction, SlashCommandStringOption } from 'discord.js';
import { components } from '../api/api.js';
import { FetchLeaderboardList } from '../api/elite.js';
import { EliteSlashCommandOption, SlashCommandOptionType } from '../classes/commands/options.js';

export const eliteLeaderboardOption: EliteSlashCommandOption = {
	name: 'leaderboard',
	description: 'The leaderboard to get results from.',
	type: SlashCommandOptionType.String,
	required: true,
	autocomplete,
};

export function leaderboardOption(required = true) {
	return (builder: SlashCommandStringOption) =>
		builder
			.setName('leaderboard')
			.setDescription('The leaderboard to get results from.')
			.setAutocomplete(true)
			.setRequired(required);
}

let leaderboards: (components['schemas']['LeaderboardInfoDto'] & { id: string })[] | undefined;

export async function autocomplete(interaction: AutocompleteInteraction) {
	if (interaction.responded) return;

	const option = interaction.options.getFocused(true);
	if (!option || option.name !== 'leaderboard') return;

	const lbKey = option.value.replace(/[^a-zA-Z0-9-]/g, '') || undefined;

	if (!lbKey) {
		interaction.respond([
			{ name: 'Farming Weight', value: 'farmingweight' },
			{ name: 'Farming Experience', value: 'farming' },
			{ name: 'Garden Experience', value: 'garden' },
		]);
		return;
	}

	const results = await getLeaderboards(lbKey);

	if (!results) {
		interaction.respond([
			{ name: 'Farming Weight', value: 'farmingweight' },
			{ name: 'Farming Experience', value: 'farming' },
			{ name: 'Garden Experience', value: 'garden' },
		]);
		return;
	}

	interaction.respond(results);
}

async function getLeaderboards(lbKey: string) {
	if (!leaderboards) await fetchLeaderboards();

	lbKey = lbKey.toLowerCase();

	const matchIndex = (str: string) => str.toLowerCase().indexOf(lbKey);

	const results = leaderboards
		?.filter((lb) => lb.id.includes(lbKey) || lb.title.toLowerCase().includes(lbKey))
		.sort((a, b) => matchIndex(a.id) - matchIndex(b.id))
		.slice(0, 5);

	return results?.map((lb) => ({
		name: lb.title,
		value: lb.id,
	}));
}

async function fetchLeaderboards() {
	const { data: leaderboardsData } = await FetchLeaderboardList().catch(() => ({
		data: undefined,
	}));
	if (!leaderboardsData) return;

	leaderboards = Object.entries(leaderboardsData.leaderboards).map(([key, lb]) => ({
		...lb,
		title: key.endsWith('-monthly')
			? `${lb.title} (Monthly)`
			: key.endsWith('-weekly')
				? `${lb.title} (Weekly)`
				: lb.title,
		id: key,
	}));
}
