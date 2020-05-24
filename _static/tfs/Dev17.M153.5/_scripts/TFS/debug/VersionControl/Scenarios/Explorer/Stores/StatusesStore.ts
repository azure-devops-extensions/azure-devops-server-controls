import * as VSSStore from  "VSS/Flux/Store";
import { GitStatus } from "TFS/VersionControl/Contracts";
import { SetupExperiencePayload } from "VersionControl/Scenarios/Explorer/ActionsHub";

export interface StatusesState {
    statuses: GitStatus[];
    isSetupExperienceVisible: boolean | undefined;
    fetchedBuildDefinitionIds: number[];
	isSetupReleaseExperienceVisible: boolean | undefined;
	createReleaseDefinitionUrl: string;
}

/**
 * A store containing the state of the statuses for this repository.
 */
export class StatusesStore extends VSSStore.Store {
    public state = {} as StatusesState;

    public clearStatuses = (): void => {
        this.state.statuses = undefined;
		this.state.isSetupExperienceVisible = undefined;
		this.state.isSetupReleaseExperienceVisible = undefined;

        this.emitChanged();
    }

    public loadStatuses = (statuses: GitStatus[]): void => {
        this.state.statuses =
            statuses
            ? this.removeOldDuplicates(statuses)
            : [];

        if (this.state.statuses.length) {
            this.state.isSetupExperienceVisible = false;
        }

        this.emitChanged();
    }

    public loadHasBuildDefinitions = (payload: SetupExperiencePayload): void => {
        this.state.isSetupExperienceVisible =
            this.state.statuses &&
            this.state.statuses.length === 0 &&
            !payload.hasBuildDefinitions &&
            payload.canCreateBuildDefinitions;

        this.state.fetchedBuildDefinitionIds = payload.buildDefinitionIds;

        this.emitChanged();
    }

	public loadHasReleaseDefinitions = (hasReleaseDefintions: boolean): void => {
		this.state.isSetupReleaseExperienceVisible = !hasReleaseDefintions;
		this.emitChanged();
	}

	public createReleaseDefinitionUrlFetched = (url: string): void => {
		this.state.createReleaseDefinitionUrl = url;
		this.emitChanged();
	}

    private removeOldDuplicates(statuses: GitStatus[]): GitStatus[] {
        const lookup: { [key: string]: GitStatus } = {};

        for(const status of statuses) {
            const typeKey = this.getStatusTypeUniqueKey(status);

            const existing = lookup[typeKey];
            if (!existing || existing.creationDate < status.creationDate) {
                lookup[typeKey] = status;
            }
        }

        const result: GitStatus[] = [];
        for (const typeKey in lookup) {
            result.push(lookup[typeKey]);
        }

        return result;
    }

    private getStatusTypeUniqueKey(status: GitStatus): string {
        return status.context.genre + "/" + status.context.name;
    }
}