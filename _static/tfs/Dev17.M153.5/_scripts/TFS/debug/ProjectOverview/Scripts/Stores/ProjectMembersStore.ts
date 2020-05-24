import { Store } from "VSS/Flux/Store";

import { MembersData, MemberInfo } from "ProjectOverview/Scripts/Generated/Contracts";
import * as ProjectOverviewResources from "ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview";

export interface ProjectMembersState {
    isUserAdmin: boolean;
    isPublicAccess: boolean; // True in case of public or anonymous access
    membersToDisplay: MemberInfo[];
    errorMessage: string;
    membersCount: number;
    hasMore: boolean;
}

export class ProjectMembersStore extends Store {
    private _state: ProjectMembersState;

    constructor(isPublicAccess: boolean) {
        super();
        this._state = {
            isUserAdmin: false,
            isPublicAccess,
            membersToDisplay: [],
            errorMessage: null,
            membersCount: 0,
            hasMore: false,
        };
    }

    public getState = (): ProjectMembersState => {
        return this._state;
    }

    public updateMembersInfo = (membersInfo: MembersData): void => {
        if (membersInfo) {
            this._state.isUserAdmin = membersInfo.isCurrentUserAdmin;
            this._state.membersToDisplay = membersInfo.members;
            this._state.membersCount = membersInfo.count;
            this._state.hasMore = membersInfo.hasMore;
            this.emitChanged();
        }
    }

    public updateErrorMessage = (message: string): void => {
        this._state.errorMessage = message || ProjectOverviewResources.ProjectMembers_ErrorLoadingMembers;

        this.emitChanged();
    }
}