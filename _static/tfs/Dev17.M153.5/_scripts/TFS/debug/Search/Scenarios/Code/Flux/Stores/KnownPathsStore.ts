import * as VSSStore from "VSS/Flux/Store";
import { FilePathsRetrievalFailedPayload } from "Search/Scenarios/Code/Flux/ActionsHub";
import { PathSourceParams } from "Search/Scenarios/Code/Flux/ActionsHub";

export interface KnownPathsState {
    knownPaths: IDictionaryStringTo<string[]>;

    bigRepos: IDictionaryStringTo<string[]>;
}

/**
 * A store containing the known filepaths for the current version as well as a list of big repos
 * for which getFilePaths API failed to return results against a given project.
 * This acts as a cache and also provides extra data to components to render properly.
 */
export class KnownPathsStore extends VSSStore.Store {
    public state: KnownPathsState = {
        knownPaths: {},
        bigRepos: {}
    };

    public reset = (): void => {
        this.state.knownPaths = {};
    }

    public loadItems = (items: string[], params: PathSourceParams): void => {
        if (items && items.length) {
            const sortedItems = orderItemsByParentFirst(items),
                { project, repositoryName, versionString } = params;
            this.state.knownPaths[createKey(project, repositoryName, versionString)] = sortedItems;
        }

        this.emitChanged();
    }

    public addBigRepo = (payload: FilePathsRetrievalFailedPayload): void => {
        const { project, repositoryName } = payload;
        if (project && repositoryName) {
            const projNameLower = project.toLowerCase();
            const repoNameLower = repositoryName.toLowerCase();

            this.state.bigRepos[projNameLower] = this.state.bigRepos[projNameLower] || [];
            this.state.bigRepos[projNameLower].push(repoNameLower);
            this.emitChanged();
        }
    }
}

/**
 * Gets a new array ensuring no child is before its parent.
 */
function orderItemsByParentFirst(items: string[]): string[] {
    return [...items].sort(comparePathLength);
}

/**
 * Compares two items by the length of its full path.
 * Null/undefined items are considered smaller.
 */
function comparePathLength(a: string, b: string): number {
    const aLength = a ? a.length : 0;
    const bLength = b ? b.length : 0;
    return aLength === bLength
        ? 0
        : aLength < bLength
            ? -1
            : 1;
}

export function createKey(project: string, repositoryName: string, versionString: string): string {
    return `${project.toLowerCase()}||${repositoryName.toLowerCase()}||${versionString.toLowerCase()}||`;
}