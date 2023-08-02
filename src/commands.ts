// import * as vscode from "vscode";
// import { createOpenAiApi, submit } from "./openai";
// import { createResultPanel } from "./panel";

// export function createSuggestImprovementsCommand (context:vscode.ExtensionContext) {
//     return async () => {

// 		const openai = createOpenAiApi();

// 		if(!openai) {
// 			console.error("failed to create OpenAiApi")
// 			return;
// 		}

// 		const prompt = "How may I improve this code? Consider? Be thorough and think clearly about software patterns that can be used to improve it. Also provide code snippets relevant to your response.";
// 		const panel = createResultPanel(context.extensionUri, context.extensionPath);
// 		submit(openai, panel, prompt);
//     }
// }

// // export const suggestImprovements = async () => {
// //     const openai = createOpenAiApi();
    
// //     if(!openai) {
// //         console.error("failed to create OpenAIApi");
// //         return;
// //     }

// //     if(!panel) {
// //         panel = createResultPanel(context.extensionUri, context.extensionPath);
// //     }
    
// //     const prompt = "How may I improve this code? First give me a high level overview and then drill down and give me actual code snippets if relevant.";
// //     submit(openai, panel, prompt);
// // }