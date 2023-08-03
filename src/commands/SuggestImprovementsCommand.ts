import { Command } from "../types";
import { runInference } from "./common";

export const SuggestImprovementsCommand: Command = {
	name: "juno.suggestImprovements",
	factory: context => async () => {
		await runInference(context, "How may I improve this code?");
	}
};