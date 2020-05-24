import * as ReactDOM from "react-dom";
import * as Navigation_Services from "VSS/Navigation/Services";
import { NavigationViewTab } from "VSS/Controls/Navigation";
import * as Performance from "VSS/Performance";
import * as Utils_String from "VSS/Utils/String";
import { ShortcutGroupDefinition } from "TfsCommon/Scripts/KeyboardShortcuts";
import { IPivotViewItem } from "VSS/Controls/Navigation";
import { Artifact } from "VSS/Artifacts/Services";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as VCSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { CommitArtifact } from "VersionControl/Scripts/CommitArtifact";
import { ChangesetArtifact } from "VersionControl/Scripts/ChangesetArtifact";
import { ShelvesetArtifact } from "VersionControl/Scripts/ShelvesetArtifact";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { ChangeList } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { LatestVersionSpec, VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { DiscussionsStore } from "VersionControl/Scripts/Stores/PullRequestReview/DiscussionsStore";

import { ActionCreator } from "VersionControl/Scenarios/ChangeDetails/Actions/ActionCreator";
import {
    ChangeDetailsPerfScenarios,
    ChangeDetailsPerfSplitScenarios,
    addPerformanceScenarioSplitTiming,
    getOrCreatePerformanceScenario
} from "VersionControl/Scenarios/ChangeDetails/ChangeDetailsTelemetry";
import * as ChangesSummaryTab from "VersionControl/Scenarios/ChangeDetails/Components/Tabs/ChangesSummaryTab";
import * as CompareTab from "VersionControl/Scenarios/ChangeDetails/Components/Tabs/CompareTab";
import * as ContentsTab from "VersionControl/Scenarios/ChangeDetails/Components/Tabs/ContentsTab";
import { ChangeListViewSource } from "VersionControl/Scenarios/ChangeDetails/Sources/ChangeListViewSource";
import { StoresHub } from "VersionControl/Scenarios/ChangeDetails/Stores/StoresHub";
import { ActionsHub } from "VersionControl/Scenarios/ChangeDetails/Actions/ActionsHub";

import { DiscussionSetup } from "VersionControl/Scenarios/ChangeDetails/DiscussionSetup";
import { IDiscussionPermissionsStore, DiscussionPermissions } from "VersionControl/Scenarios/Shared/Permissions/DiscussionPermissionsStore";
import { DiscussionAdapter } from "VersionControl/Scripts/Stores/PullRequestReview/DiscussionManagerStore";
import { ActionsHub as DiscussionActionsHub } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";

export interface ChangeDetailsViewState {
    fullScreenMode: boolean;
}

// shim for changes summary tab -> react rendering. 
// Exporting for testing
export class VCChangesSummaryTab extends NavigationViewTab {
    private _customerIntelligenceData: CustomerIntelligenceData;
    private _hasComponent: boolean;

    public initialize(): void {
        super.initialize();

        this._customerIntelligenceData = (this._options.customerIntelligenceData) ? this._options.customerIntelligenceData : (new CustomerIntelligenceData());
        this._customerIntelligenceData.setTab(CustomerIntelligenceConstants.CHANGELIST_DETAILS_VIEW_CHANGES_SUMMARY_TAB_FEATURE);
    }

    public onNavigate(rawState: any, parsedState: ChangeDetailsViewState): void {
        if (!this._hasComponent) {
            const performanceScenario = getOrCreatePerformanceScenario(this._options.performanceScenario, ChangeDetailsPerfScenarios.ChangesSummaryTab);
            addPerformanceScenarioSplitTiming(performanceScenario, ChangeDetailsPerfSplitScenarios.ChangesSummaryTabLoadBegin);

            CustomerIntelligenceData.publishFirstTabView(CustomerIntelligenceConstants.CHANGELIST_DETAILS_VIEW_CHANGES_SUMMARY_TAB_FEATURE, parsedState, this._options);

            const changesSummaryTabProps: ChangesSummaryTab.IChangesSummaryTabProps = {
                customerIntelligenceData: this._customerIntelligenceData,
                performanceScenario: performanceScenario,
                storesHub: this._options.storesHub,
                fullScreenModeChangedCallBack: this._options.actionCreator.toggleFullScreen,
            };

            ChangesSummaryTab.renderTab(this._element[0], changesSummaryTabProps);

            this._hasComponent = true;
        }
    }

    protected _dispose(): void {
        ReactDOM.unmountComponentAtNode(this._element[0]);
        super._dispose();
    }
}

// shim for compare tab -> react rendering
// Exporting for testing
export class VCCompareTab extends NavigationViewTab {
    private _hasComponent: boolean;

    public onNavigate(rawState: any, parsedState: ChangeDetailsViewState): void {
        if (!this._hasComponent) {
            const performanceScenario = getOrCreatePerformanceScenario(this._options.performanceScenario, ChangeDetailsPerfScenarios.CompareTab);
            addPerformanceScenarioSplitTiming(performanceScenario, ChangeDetailsPerfSplitScenarios.CompareTabLoadBegin);

            CustomerIntelligenceData.publishFirstTabView(CustomerIntelligenceConstants.CHANGELIST_DETAILS_VIEW_COMPARE_TAB_FEATURE, parsedState, this._options);

            const compareTabProps: CompareTab.ICompareTabProps = {
                performanceScenario: performanceScenario,
                storesHub: this._options.storesHub,
                actionCreator: this._options.actionCreator,
            };

            CompareTab.renderTab(this._element[0], compareTabProps);

            this._hasComponent = true;
        }
    }

    protected _dispose(): void {
        ReactDOM.unmountComponentAtNode(this._element[0]);
        super._dispose();
    }
}

// shim for contents tab -> react rendering.
// Exporting for testing
export class VCContentsTab extends NavigationViewTab {
    private _hasComponent: boolean;

    public onNavigate(rawState: any, parsedState: ChangeDetailsViewState): void {
        if (!this._hasComponent) {
            const performanceScenario = getOrCreatePerformanceScenario(this._options.performanceScenario, ChangeDetailsPerfScenarios.Contents);
            addPerformanceScenarioSplitTiming(this._options.performanceScenario, ChangeDetailsPerfSplitScenarios.ContentsTabLoadBegin);

            CustomerIntelligenceData.publishFirstTabView(CustomerIntelligenceConstants.CHANGELIST_DETAILS_VIEW_CONTENTS_TAB_FEATURE, parsedState, this._options);

            const contentsTabProps: ContentsTab.IContentsTabProps = {
                performanceScenario: performanceScenario,
                storesHub: this._options.storesHub,
            };

            ContentsTab.renderTab(this._element[0], contentsTabProps);

            this._hasComponent = true;
        }
    }

    protected _dispose(): void {
        ReactDOM.unmountComponentAtNode(this._element[0]);

        super._dispose();
    }
}

// shortcut group for the change details page
export class ChangeListViewShortcutGroup extends ShortcutGroupDefinition {
    constructor(actionCreator: ActionCreator) {
        super(VCResources.KeyboardShortcutGroup_Code);

        this.registerShortcut("z", {
            description: VCResources.ToggleFullScreenShortcutText,
            action: () => {
                actionCreator.toggleFullScreen();
            },
        });
    }
}

/**
 * Temporary ShelvesetArtifact until https://mseng.visualstudio.com/b924d696-3eae-4116-8443-9a18392d8544/_workitems?id=953415
 * TODO: Clean it up once issue is resolved
 */
class ShelvesetArtifact2 extends ShelvesetArtifact {
    public getId(): string {
        const {name, owner} = this._data;

        if (name && owner) {
            return this.encodeURIPart(Utils_String.format(
                '{0}&shelvesetOwner={1}',
                this.encodeURIPart(name),
                this.encodeURIPart(owner)));
        }
    }

    /**
     * Use native encoding but replace (spaces) with '+'
     */
    private encodeURIPart(value: string): string {
        return encodeURIComponent(value).replace(new RegExp('%20', 'g'), '+');
    }
}

/**
 * Create discussion adapter for new discussion control
 */
export function getDiscussionAdapter(
    versionSpec: VersionSpec,
    actionsHub: ActionsHub,
    discussionActionsHub: DiscussionActionsHub,
    discussionsStore: DiscussionsStore,
    permissionsStore: IDiscussionPermissionsStore<DiscussionPermissions, any>, // any since we dont care about raw permissions sent
    tfsContext: TfsContext,
    repositoryContext: RepositoryContext,
    projectGuid: string): DiscussionAdapter {

    let artifact: Artifact;
    let discussionAdapter: DiscussionAdapter;

    if (versionSpec instanceof VCSpecs.ShelvesetVersionSpec) {
        artifact = new ShelvesetArtifact2(versionSpec);
    }
    else if (versionSpec instanceof VCSpecs.ChangesetVersionSpec) {
        artifact = new ChangesetArtifact(versionSpec);
    }
    else if (versionSpec instanceof VCSpecs.GitCommitVersionSpec) {
        artifact = new CommitArtifact(
            $.extend(
                {
                    projectGuid: projectGuid,
                    repositoryId: repositoryContext.getRepositoryId(),
                },
                versionSpec
            )
        );
    }

    if (artifact) {
        discussionAdapter = DiscussionSetup.initialize(
            tfsContext,
            artifact.getUri(),
            actionsHub,
            discussionActionsHub,
            discussionsStore,
            permissionsStore);
    }

    return discussionAdapter;
}

/**
 * Check if a path is part of changelist
 */
export function changeExistsInPath(changeList: any, path: string): boolean {
    if (changeList && changeList.changes) {
        return changeList.changes.some((change) => Utils_String.startsWith(change.item.serverItem, path, Utils_String.localeComparer));
    }
    return false;
}

export function getPivotViewItem(id: string, text: string, title?: string): IPivotViewItem {
    const pivotViewItem = {
        text: text,
        id: id,
        link: getFragmentAction(id),
        disabled: true,
    } as IPivotViewItem;

    if (title) {
        pivotViewItem.title = title;
    }

    return pivotViewItem;
}

export function getFragmentAction(actionId: string): string {
    return "#_a=" + actionId;
}