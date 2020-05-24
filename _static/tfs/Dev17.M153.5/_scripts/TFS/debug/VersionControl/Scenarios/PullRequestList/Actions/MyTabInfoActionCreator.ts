import * as VCContracts from "TFS/VersionControl/Contracts";
import * as VCPullRequestsControls from "VersionControl/Scripts/Controls/PullRequest";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import { ITabInfoActionCreator } from "VersionControl/Scenarios/PullRequestList/Actions/TabInfoActionCreator";
import { IPullRequestListSource } from "VersionControl/Scenarios/PullRequestList/Sources/PullRequestListSource";
import * as Actions from "VersionControl/Scenarios/PullRequestList/Actions/ActionsHub";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { PullRequestListQueryCriteria } from "VersionControl/Scenarios/PullRequestList/PullRequestListQueryCriteria";
import { TabInfo } from "VersionControl/Scenarios/PullRequestList/Stores/TabsInfoStore";
import { WebApiTeam } from "TFS/Core/Contracts";
import * as Utils_String from "VSS/Utils/String";
import { PullRequestListSectionInfo } from "VersionControl/Scenarios/PullRequestList/PullRequestListDataModel";
import { PullRequestListTelemetry } from "VersionControl/Scenarios/PullRequestList/PullRequestListTelemetry";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { Notification, NotificationType } from "VersionControl/Scenarios/Shared/Notifications/NotificationStore";
import { GUIDUtils } from "Presentation/Scripts/TFS/TFS.Core.Utils";

import * as PivotView from "Presentation/Scripts/TFS/Components/PivotView";
import * as Navigation from "VSS/Controls/Navigation";

export class MyTabInfoActionCreator implements ITabInfoActionCreator {
    private _actionsHub: Actions.ActionsHub;
    private _tfsContext: TfsContext;
    private _pullRequestListSource: IPullRequestListSource;
    private _telemtery: PullRequestListTelemetry;

    constructor(actionsHub: Actions.ActionsHub, tfsContext: TfsContext, pullRequestListSource: IPullRequestListSource, telemetry: PullRequestListTelemetry) {
        this._actionsHub = actionsHub;
        this._tfsContext = tfsContext;
        this._pullRequestListSource = pullRequestListSource;
        this._telemtery = telemetry;
    }

    public initializeTabsInfo(): void {
        this._pullRequestListSource.getTeamMemberships().then((teams) => {
            this._telemtery.logActivity(CustomerIntelligenceConstants.MY_PULL_REQUEST_LIST_TEAMS_FEATURE, {
                "count": teams.length
            });
            const tabsInfo: TabInfo[] = [
                {
                    tabId: VCPullRequestsControls.PullRequestsActions.ACTIVE,
                    sections: this._getActiveSections(this._tfsContext, teams),
                    isDefault: true
                },
                {
                    tabId: VCPullRequestsControls.PullRequestsActions.COMPLETED,
                    sections: this._getCompletedSections(this._tfsContext),
                }
            ];

            this._actionsHub.tabInfoUpdated.invoke({ tabs: tabsInfo });
        }, (reason: Error) => {
            if (!reason || !reason.message) {
                return;
            }

            this._telemtery.logError(CustomerIntelligenceConstants.MY_PULL_REQUEST_LIST_TEAMS_FEATURE, reason);

            this._actionsHub.addNotification.invoke({
                message: reason.message,
                type: NotificationType.error,
                isDismissable: true,
            });
        });
    }
    
    private _getActiveSections(tfsContext: TfsContext, teams: WebApiTeam[]): PullRequestListSectionInfo[] {
        // set mine class to enable last visited functionality
        const cssClass = "mine";
        const sections: PullRequestListSectionInfo[] = [
            {
                criteria: new PullRequestListQueryCriteria(VCContracts.PullRequestStatus.Active, tfsContext.currentIdentity.id, null, VCResources.PullRequests_ResultHeader_CreatedByMe),
                cssClass: cssClass,
                isCollapsed: false,
                id: GUIDUtils.newGuid()
            },
            {
                criteria: new PullRequestListQueryCriteria(VCContracts.PullRequestStatus.Active, null, tfsContext.currentIdentity.id, VCResources.PullRequests_ResultHeader_AssignedToMe),
                cssClass: cssClass,
                isCollapsed: false,
                id: GUIDUtils.newGuid()
            }
        ];

        if (teams && teams.length) {
            const clientFilter = (pullRequests: VCContracts.GitPullRequest[]) => {
                const currentId = tfsContext.currentIdentity.id;
                return pullRequests.filter(pr => pr.createdBy.id != currentId && !pr.reviewers.some(reviewer => reviewer.id === currentId));
            };
            teams.forEach((team, index) => {
                const sectionTitle = Utils_String.format(VCResources.PullRequests_ResultHeader_AssignedToTeamWithName, team.name); 
                sections.push({
                    criteria: new PullRequestListQueryCriteria(VCContracts.PullRequestStatus.Active, null, team.id, sectionTitle, clientFilter),
                    cssClass: cssClass,
                    isCollapsed: true,
                    isTeam: true,
                    id: GUIDUtils.newGuid()
                });
            });
        }

        return sections;
    }

    private _getCompletedSections(tfsContext: TfsContext): PullRequestListSectionInfo[] {
        return [
            {
                criteria: new PullRequestListQueryCriteria(VCContracts.PullRequestStatus.Completed, tfsContext.currentIdentity.id, null, VCResources.PullRequests_ResultHeader_CreatedByMe),
                isCollapsed: false,
                id: GUIDUtils.newGuid()
            },
            {
                criteria: new PullRequestListQueryCriteria(VCContracts.PullRequestStatus.Completed, null, tfsContext.currentIdentity.id, VCResources.PullRequests_ResultHeader_AssignedToMe),
                isCollapsed: true,
                id: GUIDUtils.newGuid()
            }
        ];
    }
}