import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";

export enum WorkItemStateCategory {
    Proposed = 1000,
    InProgress = 2000,
    Resolved = 3000,
    Completed = 4000,
    Removed = 5000
}

export enum BacklogFieldTypes {
    Effort = 1,
    Order = 2,
    RemainingWork = 3,
    Team = 4,
    Activity = 5,
    Requestor = 6,
    ApplicationType = 7,
    ApplicationStartInformation = 8,
    ApplicationLaunchInstructions = 9,
    FeedbackNotes = 10,
    ClosedDate = 11
}

export interface WorkItemTypeStateInfo {
    readonly workItemTypeName: string;
    readonly states: IDictionaryStringTo<WorkItemStateCategory>;
}

export interface IBacklogFields {
    readonly typeFields: { [key: /* BacklogFieldTypes */ number]: string };
}

export interface IColumnField {
    readonly columnFieldReference: string;
    readonly width: number;
}

export interface IBacklogLevelConfiguration {
    readonly id: string;
    readonly name: string;
    readonly rank: number;
    readonly color: string;
    readonly workItemCountLimit: number;
    readonly addPanelFields: string[];
    readonly columnFields: IColumnField[];
    readonly workItemTypes: string[];
    readonly defaultWorkItemType: string;
}

export class BacklogConfiguration {

    public static BACKLOG_LEVEL_DEFAULT_COLOR = "#00FFCC";
    private _allBacklogs: IBacklogLevelConfiguration[];

    constructor(readonly projectId: string,
                readonly workItemTypeMappedStates: WorkItemTypeStateInfo[],
                readonly backlogFields: IBacklogFields,
                readonly taskBacklog: IBacklogLevelConfiguration,
                readonly requirementBacklog: IBacklogLevelConfiguration,
                readonly portfolioBacklogs: IBacklogLevelConfiguration[],
                readonly hiddenBacklogs: string[],
                readonly teamId: string
            ) {}

    /**
     * Returns all backlog levels in descending order (i.e., portfolios first and tasks last)
     */
    public getAllBacklogLevels(): IBacklogLevelConfiguration[] {
        if (!this._allBacklogs) {
            this._allBacklogs = [];
            const portfolios = this.portfolioBacklogs || [];
            const requirements = this.requirementBacklog ? [this.requirementBacklog] : [];
            const tasks = this.taskBacklog ? [this.taskBacklog] : [];
            this._allBacklogs = portfolios.concat(requirements).concat(tasks);
            this._allBacklogs = this._allBacklogs.sort((a: IBacklogLevelConfiguration, b: IBacklogLevelConfiguration) => b.rank - a.rank);
        }
        return this._allBacklogs.slice();
    }

    public getAllProductBacklogLevels(): IBacklogLevelConfiguration[] {
        return this.getAllBacklogLevels().filter((bl) => {
            return Utils_String.ignoreCaseComparer(bl.id, this.taskBacklog.id) !== 0;
        });
    }

    public getVisibleProductBacklogLevels(): IBacklogLevelConfiguration[] {
        return this.getAllProductBacklogLevels().filter((bl) => this.isBacklogLevelVisible(bl.id));
    }

    public isBacklogLevelVisible(id: string): boolean {
        return !Utils_Array.contains(this.hiddenBacklogs, id, Utils_String.ignoreCaseComparer);
    }

    /**
     * Checks if given backlog is the root level backlog
     * @param backlogId
     */
    public isRootLevelBacklog(backlogId: string): boolean {
        const rootBacklogLevel = this.getAllBacklogLevels()[0];
        return Utils_String.equals(rootBacklogLevel.id, backlogId, true);
    }

    /**
     * Gets the backlog level with the specified name.
     * @returns The matching backlog level configuration; null if not found.
     */
    public getBacklogByDisplayName(name: string): IBacklogLevelConfiguration {
        for (const backlog of this.getAllBacklogLevels()) {
            if (Utils_String.equals(backlog.name, name, true)) {
                return backlog;
            }
        }
        return null;
    }

    /** Get backlog level with specified workItemType name.
      * @returns Matching backlog level configuration; null if not found.
      */
    public getBacklogByWorkItemTypeName(name: string): IBacklogLevelConfiguration {
        for (let backlog of this.getAllBacklogLevels()) {
            if (Utils_Array.contains(backlog.workItemTypes, name, Utils_String.ignoreCaseComparer)) {
                return backlog;
            }
        }
        return null;
    }

    /**
     * Get workitem states for given type and state-category
     * @param workItemType
     * @param stateCategory
     */
    public getWorkItemStatesForStateCategory(workItemType: string, stateCategory: WorkItemStateCategory): string[] {
        const result: string[] = [];
        if (this.workItemTypeMappedStates) {
            for (const info of this.workItemTypeMappedStates) {
                if (Utils_String.equals(info.workItemTypeName, workItemType, true)) {
                    for (let x of Object.keys(info.states)) {
                        if (info.states[x] === stateCategory) {
                            result.push(x);
                        }
                    }
                }
            }
        }
        return result.slice();
    }

    /**
     * Get workitem state category (also called as metastate) for given workitemtype and state
     * @param workItemType
     * @param state
     */
    public getWorkItemStateCategory(workItemType: string, state: string): WorkItemStateCategory {
        if (this.workItemTypeMappedStates) {
            for (const val of this.workItemTypeMappedStates) {
                if (Utils_String.equals(val.workItemTypeName, workItemType, true)) {
                    for (let x of Object.keys(val.states)) {
                        if (Utils_String.equals(x, state)) {
                            return val.states[x];
                        }
                    }
                }
            }
        }
        return null;
    }

    public getStatesForWorkItems(workItemTypes: string[]): string[] {
        const result: string[] = [];
        if (this.workItemTypeMappedStates) {
            for (const val of this.workItemTypeMappedStates) {
                if (val.states && Utils_Array.contains(workItemTypes, val.workItemTypeName, Utils_String.ignoreCaseComparer)) {
                    result.push(...Object.keys(val.states))
                }
            }
        }
        return Utils_Array.unique(result, Utils_String.ignoreCaseComparer);
    }

    /**
     * Checks if a workitem belongs to requirement backlog
     * @param workItemTypeName
     */
    public isWorkItemTypeInRequirementBacklog(workItemTypeName: string): boolean {
        const requirements = this.requirementBacklog;
        if (requirements && requirements.workItemTypes) {
            return Utils_Array.contains(requirements.workItemTypes, workItemTypeName, Utils_String.ignoreCaseComparer);
        }
        return false;
    }
}