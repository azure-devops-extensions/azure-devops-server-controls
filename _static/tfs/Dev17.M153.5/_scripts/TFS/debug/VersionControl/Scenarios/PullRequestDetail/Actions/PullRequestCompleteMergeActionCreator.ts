import { ActionsHub } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { SourcesHub } from "VersionControl/Scripts/Sources/SourcesHub";
import { StoresHub } from "VersionControl/Scripts/Stores/PullRequestReview/StoresHub";

import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { publishEvent, TelemetryEventData } from "VSS/Telemetry/Services";

import * as VCContracts from "TFS/VersionControl/Contracts";
import { ISquashPolicySetting } from "VersionControl/Scenarios/PullRequestDetail/Stores/ClientPolicyEvaluationStore";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import * as UserClaimsService from "VSS/User/Services";

import {
    MergeOptionsDeleteSourceCheckboxMode,
    MergeOptionsSquashMergeCheckboxMode,
    MergeOptionsTransitionWorkItemsCheckboxMode,
} from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";

export class PullRequestCompleteMergeActionCreator {
    private _actionsHub: ActionsHub;
    private _storesHub: StoresHub;
    private _sourcesHub: SourcesHub;
    private _repositoryContext: RepositoryContext;

    public constructor(repositoryContext: RepositoryContext, actionsHub: ActionsHub, sourcesHub: SourcesHub, storesHub: StoresHub) {
        this._actionsHub = actionsHub;
        this._storesHub = storesHub;
        this._sourcesHub = sourcesHub;
        this._repositoryContext = repositoryContext;
    }

    public openCompleteMergeDialog(){
        const prefs = this._storesHub.userPreferencesStore.getPreferences();
        const pullRequestDetail = this._storesHub.pullRequestDetailStore.getPullRequestDetail();

        let shouldDeleteSourceBranch = prefs ? prefs.mergeOptionsDeleteSourceCheckboxMode === MergeOptionsDeleteSourceCheckboxMode.Checked : null;
        // over-write preferences if delete permissions would prevent deletion
        shouldDeleteSourceBranch = pullRequestDetail.canDeleteSourceBranch ? shouldDeleteSourceBranch : false;

        const shouldTransitionWorkItems = prefs ? prefs.mergeOptionsTransitionWorkItemsCheckboxMode === MergeOptionsTransitionWorkItemsCheckboxMode.Checked : null;
        const squashPolicySetting = this._getSquashMergeSettings();
        const shouldSquashMerge = this._getShouldSquashMerge(squashPolicySetting);

        this._actionsHub.completionDialogOpened.invoke({
            associatedWorkItemIds: this._storesHub.relatedWorkItemsStore.getWorkItems(),
            shouldDeleteSourceBranch,
            shouldSquashMerge,
            shouldTransitionWorkItems,
            canBypassPolicy: this._storesHub.pullRequestDetailStore.canBypassPolicy(),
            canTransitionWorkItems: true,
            squashPolicySetting,
            pullRequestDetail,
        });
    }

    public updateMergeTitle(mergeTitle: string): void {
        this._actionsHub.mergeTitleUpdated.invoke({mergeTitle});
    }

    public updateMergeDescription(mergeDescription: string): void {
        this._actionsHub.mergeDescriptionUpdated.invoke({mergeDescription});
    }

    public updateBypassReason(bypassReason: string): void {
        this._actionsHub.bypassReasonUpdated.invoke({bypassReason});
    }

    public updateBypassPolicy(shouldEnable: boolean): void {
        this._actionsHub.bypassUpdated.invoke({shouldEnable});
    }

    public publishTelemetry(): void {
        const store = this._storesHub.pullRequestCompletionOptionsStore;
        const originalDetails: string = store.getInitialMergeDescription();
        const originalTitle: string = store.getInitialMergeTitle();
        const mergeTitle: string = store.getMergeTitle();
        const mergeDescription: string = store.getMergeDescription();
        const completionOptions = store.getCompletionOptions();

        // there is an issue here because we lose the originalDetails if the user auto-completes and then cancels
        const completeMergeEvent = new TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.PULL_REQUEST_COMPLETE_MERGE, {
                TitleWasChanged: (mergeTitle !== originalTitle),
                DetailsWasChanged: (mergeDescription !== originalDetails),
                TitleAndDetailsWereSwapped: ((mergeTitle === originalDetails) && (mergeDescription === originalTitle)),
                DetailsWasBlank: (mergeDescription.length === 0),
                UncheckedDeleteSource: !completionOptions.deleteSourceBranch,
                TransitionWorkItemsSelected: completionOptions.transitionWorkItems,
                SquashMergeSelected: completionOptions.squashMerge,
                BypassPoliciesSelected: completionOptions.bypassPolicy,
            });
        publishEvent(completeMergeEvent);
    }

    private _getShouldSquashMerge(squashPolicySetting: ISquashPolicySetting): boolean {
        const prefs = this._storesHub.userPreferencesStore.getPreferences();

        const shouldSquashMerge = prefs ? prefs.mergeOptionsSquashMergeCheckboxMode === MergeOptionsSquashMergeCheckboxMode.Checked : null;

        // over-write preferences if the merge policy requires a specific value and the policy isn't overridden
        return squashPolicySetting.isEnabled ? squashPolicySetting.useSquashMerge : shouldSquashMerge;
    }

    private _getSquashMergeSettings(): ISquashPolicySetting {
        return this._storesHub.clientPolicyEvaluationStore.state.mergePolicySetting;
    }
}
