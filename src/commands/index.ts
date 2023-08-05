/**
 * Every command exported from this file will get registered
 * by the extension with the proper extension context.
 * Make sure every export implements the Command class, 
 * preferrably by using the createCommand factory method.
 */
export { openPromptCommand } from './openPromptCommand';
export { selectModelCommand } from './selectModelCommand';
export { suggestImprovementsCommand } from './suggestImprovementsCommand';
export { createCodeCommand } from './createCodeCommand';
export { functionExampleCommand } from './functionsExampleCommand';
export { testCommand } from './testCommand';
export { indexRepoCommand } from './indexRepoCommand';
export { indexFileCommand } from './indexFileCommand';
export { queryRepoCommand } from './queryRepoCommand';
export { deleteRepoIndexCommand } from './deleteRepoIndexCommand';