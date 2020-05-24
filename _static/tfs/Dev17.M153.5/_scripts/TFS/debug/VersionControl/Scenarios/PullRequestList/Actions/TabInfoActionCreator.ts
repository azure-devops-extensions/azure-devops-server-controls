import * as VCContracts from "TFS/VersionControl/Contracts";
import * as VCPullRequestsControls from "VersionControl/Scripts/Controls/PullRequest";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as Utils_String from "VSS/Utils/String";
import * as Actions from "VersionControl/Scenarios/PullRequestList/Actions/ActionsHub";
import { PullRequestListActionCreator } from "VersionControl/Scenarios/PullRequestList/Actions/PullRequestListActionCreator";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { PullRequestListQueryCriteria, EmptyCriteria } from "VersionControl/Scenarios/PullRequestList/PullRequestListQueryCriteria";
import { PullRequestListSectionInfo } from "VersionControl/Scenarios/PullRequestList/PullRequestListDataModel";
import { TabInfo, TabsInfoStore } from "VersionControl/Scenarios/PullRequestList/Stores/TabsInfoStore";
import { FeatureAvailabilitySource } from "VersionControl/Scenarios/Shared/Sources/FeatureAvailabilitySource";
import { GUIDUtils } from "Presentation/Scripts/TFS/TFS.Core.Utils";
import * as Navigation from "VSS/Controls/Navigation";
import * as UserClaimsService from "VSS/User/Services";

export interface ITabInfoActionCreator {
    initializeTabsInfo(): void;
}

export class TabInfoActionCreator implements ITabInfoActionCreator {
    private _actionsHub: Actions.ActionsHub;
    private _tfsContext: TfsContext;
    private _claimService: UserClaimsService.IUserClaimsService;

    constructor(
        actionsHub: Actions.ActionsHub,
        private featureAvailabilitySource: FeatureAvailabilitySource,
        tfsContext: TfsContext,
    ) {
        this._actionsHub = actionsHub;
        this._tfsContext = tfsContext;
        this._claimService = UserClaimsService.getService();
    }

    public initializeTabsInfo(): void {
        const tabsInfo: TabInfo[] = [];

        if (this._claimService.hasClaim(UserClaimsService.UserClaims.Member)) {
            tabsInfo.push({
                tabId: VCPullRequestsControls.PullRequestsActions.MINE,
                sections: this._getMineSections(this._tfsContext),
                isDefault: true
            });
        }

        tabsInfo.push({
            tabId: VCPullRequestsControls.PullRequestsActions.ACTIVE,
            sections: this._getSections(VCContracts.PullRequestStatus.Active),
        });

        tabsInfo.push({
            tabId: VCPullRequestsControls.PullRequestsActions.COMPLETED,
            sections: this._getSections(VCContracts.PullRequestStatus.Completed),
        });

        tabsInfo.push({
            tabId: VCPullRequestsControls.PullRequestsActions.ABANDONED,
            sections: this._getSections(VCContracts.PullRequestStatus.Abandoned),
        });

        this._actionsHub.tabInfoUpdated.invoke({ tabs: tabsInfo });
    }

    private _getMineSections(tfsContext: TfsContext): PullRequestListSectionInfo[] {
        const sections: PullRequestListSectionInfo[] = [
            {
                criteria: new PullRequestListQueryCriteria(
                    VCContracts.PullRequestStatus.Active,
                    tfsContext.currentIdentity.id,
                    null,
                    VCResources.PullRequests_ResultHeader_CreatedByMe,
                    null,
                    "CreatedByMeActive"),
                cssClass: "mine",
                id: GUIDUtils.newGuid()
            },
            {
                criteria: new PullRequestListQueryCriteria(
                    VCContracts.PullRequestStatus.Active,
                    null,
                    tfsContext.currentIdentity.id,
                    VCResources.PullRequests_ResultHeader_AssignedToMe,
                    null,
                    "AssignedToMeActive"),
                cssClass: "mine",
                id: GUIDUtils.newGuid()
            }
        ];

        if (this.featureAvailabilitySource.isVerticalNavigation()) {
            const customSection: PullRequestListSectionInfo = {
                criteria: EmptyCriteria,
                cssClass: "mine",
                customizeable: true,
                id: GUIDUtils.newGuid()
            };

            sections.push(customSection);
        }
        else if (tfsContext.currentTeam) {
            const sectionTitle = Utils_String.format(VCResources.PullRequests_ResultHeader_AssignedToTeamWithName, tfsContext.currentTeam.name);
            const clientFilter = (pullRequests: VCContracts.GitPullRequest[]) => {
                const currentId = tfsContext.currentIdentity.id;
                return pullRequests.filter(pr => pr.createdBy.id != currentId && !pr.reviewers.some(reviewer => reviewer.id === currentId));
            };
            const section: PullRequestListSectionInfo = {
                criteria: new PullRequestListQueryCriteria(
                    VCContracts.PullRequestStatus.Active,
                    null,
                    tfsContext.currentTeam.identity.id,
                    sectionTitle,
                    clientFilter,
                    "AssignedToMyTeamActive"),
                cssClass: "mine",
                id: GUIDUtils.newGuid()
            };

            sections.push(section);
        }

        return sections;
    }

    private _getSections(status: VCContracts.PullRequestStatus): PullRequestListSectionInfo[] {
        return [{ criteria: new PullRequestListQueryCriteria(status, null, null), id: GUIDUtils.newGuid() }];
    }
}
