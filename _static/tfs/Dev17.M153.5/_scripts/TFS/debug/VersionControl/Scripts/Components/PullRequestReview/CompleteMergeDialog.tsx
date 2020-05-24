/// <reference types="react-dom" />

import * as React from "react";

import { autobind, getId } from "OfficeFabric/Utilities";
import { PrimaryButton, DefaultButton } from "OfficeFabric/Button";
import { Checkbox } from "OfficeFabric/Checkbox";
import { Dialog, DialogFooter, DialogType } from "OfficeFabric/Dialog";
import { Link } from "OfficeFabric/Link";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { TextField } from "OfficeFabric/TextField";
import { DirectionalHint, TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";

import { format } from "VSS/Utils/String";

import { PolicyEvaluationStatus } from "Policy/Scripts/Generated/TFS.Policy.Contracts";
import { GitPullRequestCompletionOptions } from "TFS/VersionControl/Contracts";

import { ClientPolicyEvaluation } from "VersionControl/Scenarios/PullRequestDetail/Policy/ClientPolicyEvaluation";
import { ISquashPolicySetting } from "VersionControl/Scenarios/PullRequestDetail/Stores/ClientPolicyEvaluationStore";
import { Flux } from "VersionControl/Scenarios/PullRequestDetail/View/PullRequestDetail.Flux";
import { AdditionalInfoTooltip } from "VersionControl/Scenarios/Shared/AdditionalInfoTooltip";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { WorkItemTransitionWarning } from "VersionControl/Scripts/Stores/PullRequestReview/RelatedWorkItemsStore";
import { FormattedComponent } from "VersionControl/Scripts/Utils/Format";

import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

import "VSS/LoaderPlugins/Css!VersionControl/CompleteMergeDialog";

export interface ICompleteMergeDialogProps {
    autoComplete: boolean;
    isOpen: boolean;
    transitionWorkItemsIsEnabled?: boolean;
    onResult(completionOptions?: GitPullRequestCompletionOptions): void;
}

export interface ICompleteMergeDialogState {
    squashPolicySetting: ISquashPolicySetting;
    policyWarning: string;
    shouldSquashMerge: boolean;
    squashMergeWarning: string;
    workItemTransitionWarning: WorkItemTransitionWarning;
    shouldDeleteSourceBranch: boolean;
    shouldTransitionWorkItems: boolean;
    canTransitionWorkItems: boolean;
    canDeleteSourceBranch: boolean;
    cannotDeleteReasonHint: string;
    sourceFriendlyName: string;
    shouldBypassPolicy: boolean;
    mergeTitle: string;
    mergeDescription: string;
    mergeDescriptionError: string;
    loading: boolean;
    canBypassPolicy: boolean;
    bypassReason: string;
    completionOptions: GitPullRequestCompletionOptions;
}

export class CompleteMergeDialog extends React.Component<ICompleteMergeDialogProps, ICompleteMergeDialogState> {
    private static readonly MAX_MERGE_DESCRIPTION_LENGTH: number = 3250;

    constructor(props: ICompleteMergeDialogProps) {
        super(props);
        this.state = this._getState();
    }

    public render(): JSX.Element {

        return (
            // we can get rid of the bowtie class when the ui-dialog moves to using it
            <Dialog
                hidden={!this.props.isOpen}
                modalProps={{
                    className: "bowtie-fabric",
                    containerClassName: "vc-complete-merge-dialog vc-dialog",
                    isBlocking: true,
                }}
                dialogContentProps={{
                    type: DialogType.close
                }}
                onDismiss={this._onCancel}
                title={this.props.autoComplete ? VCResources.PullRequest_AutoCompleteMergeDialog_Title : VCResources.PullRequest_CompleteMergeDialog_Title}
                closeButtonAriaLabel={VCResources.PullRequest_CompleteMergeDialog_CancelText}>
                {this._createDialogContent()}
                <DialogFooter>
                    <PrimaryButton
                        onClick={this._onSave}
                        className={(this.state.shouldBypassPolicy && this._isBypassOptionVisible && this._isCompleteButtonEnabled) ? "bowtie-widget warning" : ""}
                        disabled={!this._isCompleteButtonEnabled}>
                        {this._getCompleteButtonText()}
                    </PrimaryButton>
                    <DefaultButton onClick={this._onCancel}>{VCResources.PullRequest_CompleteMergeDialog_CancelText}</DefaultButton>
                </DialogFooter>
            </Dialog>
        );
    }

    private _createDialogContent(): JSX.Element {
        const isDeleteSourceBranchOptionEnabled: boolean = this.state.canDeleteSourceBranch;
        const deleteControlTitle = !isDeleteSourceBranchOptionEnabled ? this.state.cannotDeleteReasonHint : null;
        const deleteLabel = format(VCResources.PullRequest_CompleteMergeDialog_DeleteSourceCheckboxLabelText, this.state.sourceFriendlyName);

        return (
            <div className="form-section">
                {
                    this.state.squashMergeWarning &&
                    <div className="vc-dialog-merge-warningarea">
                        <MessageBar messageBarType={MessageBarType.warning}>
                            {this.state.squashMergeWarning}
                        </MessageBar>
                    </div>
                }
                {
                    this.state.workItemTransitionWarning && this.state.shouldTransitionWorkItems &&
                    <div className="vc-dialog-merge-warningarea">
                        <MessageBar messageBarType={MessageBarType.warning}>
                            <FormattedComponent format={VCResources.PullRequest_CompleteMergeDialog_WorkItemTransitionWarningFormat} className={"work-item-transition-warning"}>
                                {[
                                    this.state.workItemTransitionWarning.message,
                                    this.state.workItemTransitionWarning.link &&
                                    <Link
                                        className="work-item-transition-link"
                                        href={this.state.workItemTransitionWarning.link}
                                        key="learn-more-link"
                                        target="_blank"
                                        rel="noopener noreferrer">
                                        {VCResources.PullRequest_CompleteMergeDialog_WorkItemTransitionWarningLearnMore}
                                    </Link>,
                                    this.state.workItemTransitionWarning.overflow,
                                ]}
                            </FormattedComponent>
                        </MessageBar>
                    </div>
                }
                {
                    !this.props.autoComplete && this.state.policyWarning &&
                    <div className="vc-dialog-merge-warningarea">
                        <MessageBar messageBarType={MessageBarType.severeWarning}>
                            {this.state.policyWarning}
                        </MessageBar>
                    </div>
                }
                <fieldset>
                    <TextField
                        className="vc-dialog-complete-merge-title-input"
                        placeholder={VCResources.PullRequest_CompleteMergeDialog_MergeTitleWatermark}
                        ariaLabel={VCResources.PullRequest_CompleteMergeDialog_MergeTitleTitle}
                        maxLength={450}
                        value={this.state.mergeTitle}
                        onChanged={this._onMergeTitleChange} />
                    <TextField
                        placeholder={VCResources.PullRequest_CompleteMergeDialog_MergeDetailsWatermark}
                        ariaLabel={VCResources.PullRequest_CompleteMergeDialog_MergeDetailsTitle}
                        rows={6}
                        multiline
                        errorMessage={this.state.mergeDescriptionError}
                        resizable={false}
                        maxLength={CompleteMergeDialog.MAX_MERGE_DESCRIPTION_LENGTH}
                        value={this.state.mergeDescription}
                        onChanged={this._onMergeDescriptionChange} />
                    {this.props.transitionWorkItemsIsEnabled &&
                        <div className={"vc-merge-dialog-line"}>
                            <Checkbox
                                id="transitionWorkItemsCheckbox"
                                disabled={!this.state.canTransitionWorkItems}
                                label={VCResources.PullRequest_CompleteMergeDialog_TransitionWorkItemsCheckboxLabelText}
                                onChange={this._onTransitionWorkItemsChange}
                                checked={this.state.shouldTransitionWorkItems} />
                            {!this.state.canTransitionWorkItems ?
                                <AdditionalInfoTooltip
                                    id={getId("transitionWorkItemsCheckboxTooltip")}
                                    content={VCResources.PullRequest_CompleteMergeDialog_TransitionWorkItemsDisabledCheckboxLabelText} />
                                : null}
                        </div>}
                    <div className={"vc-merge-dialog-line"}>
                        <TooltipHost
                            content={deleteLabel}
                            directionalHint={DirectionalHint.bottomCenter}
                            overflowMode={TooltipOverflowMode.Parent}>
                            <Checkbox
                                id="deleteSourceBranchCheckbox"
                                disabled={!isDeleteSourceBranchOptionEnabled}
                                title={deleteControlTitle}
                                onChange={this._onDeleteSourceBranchChange}
                                checked={this.state.shouldDeleteSourceBranch}
                                label={deleteLabel} />
                        </TooltipHost>
                        {!isDeleteSourceBranchOptionEnabled ?
                            <AdditionalInfoTooltip
                                id={getId("deleteSourceBranchCheckboxTooltip")}
                                content={this.state.cannotDeleteReasonHint} />
                            : null}
                    </div>
                    <div className={"vc-merge-dialog-line"}>
                        <Checkbox
                            key="squashMergeCheckbox"
                            disabled={this.state.squashPolicySetting.isEnabled && !this.state.shouldBypassPolicy}
                            onChange={this._onSquashMergeChange}
                            checked={this.state.shouldSquashMerge}
                            label={VCResources.PullRequest_CompleteMergeDialog_SquashMergeCheckboxLabelText} />
                        {this.state.squashPolicySetting.isEnabled ?
                            <AdditionalInfoTooltip
                                id={getId("squashMergeCheckboxTooltip")}
                                content={this.state.squashPolicySetting.reason} />
                            : null}
                        <Link
                            className={"vc-dialog-squash-merge-link"}
                            href="https://go.microsoft.com/fwlink/?LinkId=708720"
                            target="_blank"
                            rel="noopener noreferrer"
                            title={VCResources.PullRequest_CompleteMergeDialog_SquashMergeLearnMoreText}>
                            {VCResources.PullRequest_CompleteMergeDialog_SquashMergeLink}
                        </Link>
                    </div>
                    {this._isBypassOptionVisible && this._createBypassControls()}
                </fieldset>
            </div>
        );
    }

    private _getCompleteButtonText(): string {
        let buttonLabel = VCResources.PullRequest_CompleteMergeDialog_OkText;

        if (this.state.shouldBypassPolicy) {
            buttonLabel = VCResources.PullRequest_CompleteMergeDialog_OverrideText;
        }
        else if (this.props.autoComplete) {
            buttonLabel = VCResources.AutoComplete;
        }

        return buttonLabel;
    }

    private _createBypassControls(): JSX.Element {
        return (
            <div>
                <Checkbox
                    className={"vc-merge-dialog-line"}
                    id="byPassPolicyCheckbox"
                    onChange={this._onBypassPolicyChange}
                    checked={this.state.shouldBypassPolicy}
                    label={VCResources.PullRequest_CompleteMergeDialog_ByPassPolicyCheckboxLabelText}
                />
                {this.state.shouldBypassPolicy &&
                    <TextField
                        className="vc-dialog-complete-merge-bypassReason-input"
                        type="text"
                        id="byPassPolicyReason"
                        onChanged={this._onBypassReasonChange}
                        maxLength={140}
                        placeholder={VCResources.PullRequest_CompleteMergeDialog_BypassReasonWatermark}
                        ariaLabel={VCResources.PullRequest_CompleteMergeDialog_BypassReasonTitle}
                        value={this.state.bypassReason}
                    />
                }
            </div>
        );
    }

    public componentDidMount(): void {
        Flux.instance().storesHub.userPreferencesStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.relatedWorkItemsStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.pullRequestDetailStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.clientPolicyEvaluationStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.pullRequestCompletionOptionsStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount(): void {
        Flux.instance().storesHub.userPreferencesStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.relatedWorkItemsStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.pullRequestDetailStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.clientPolicyEvaluationStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.pullRequestCompletionOptionsStore.removeChangedListener(this._onChange);
    }

    @autobind
    private _onCancel() {
        this.props.onResult();
    }

    @autobind
    private _onSave() {
        if (!this._isCompleteButtonEnabled) {
            return;
        }

        Flux.instance().actionCreator.completeMergeActionCreator.publishTelemetry();

        // When completing a pull request, make sure we write the uesr's preferences to the registry
        // so that we capture that they've used the default and can change defaults in the future without
        // impacting users who are already used to the previous default.
        Flux.instance().actionCreator.userPreferenceActionCreator.forceUpdatePreferences();

        this.props.onResult(this.state.completionOptions);
    }

    private get _isBypassOptionVisible(): boolean {
        return !this.props.autoComplete &&
            this.state &&
            // Show the bypass option if there is a policy that can be overridden (including the
            // Squash Policy which doesn't cause a warning)
            (this.state.policyWarning || this.state.squashPolicySetting.isEnabled) &&
            this.state.canBypassPolicy;
    }

    private get _isCompleteButtonEnabled(): boolean {
        if (this.state.loading) {
            return false;
        }

        // disable Complete button if user is choosing to override policies, but didn't enter a reason
        if (this.state.shouldBypassPolicy && this.state.bypassReason.length < 1) {
            return false;
        }

        // disable Complete button if user can bypass, there is a policy warning, and the user hasn't chosen to override policies
        if (this._isBypassOptionVisible && this.state.policyWarning && !this.state.shouldBypassPolicy) {
            return false;
        }

        // disable Complete button if merge description is too long
        if (this.state.mergeDescriptionError) {
            return false;
        }

        return true;
    }

    @autobind
    private _onChange() {
        this.setState(this._getState());
    }

    private _getState(): ICompleteMergeDialogState {
        const prefs = Flux.instance().storesHub.userPreferencesStore.getPreferences();
        const completeMergeStore = Flux.instance().storesHub.pullRequestCompletionOptionsStore;
        const squashPolicySetting = completeMergeStore.getSquashPolicySetting();
        const mergeTitle = completeMergeStore.getMergeTitle();
        const mergeDescription = completeMergeStore.getMergeDescription();
        const completionOptions = completeMergeStore.getCompletionOptions();
        const mergeDescriptionError = completeMergeStore.getMergeDescriptionError();
        const bypassReason = completeMergeStore.getBypassReason();
        const shouldDeleteSourceBranch = completeMergeStore.getCompletionOptions().deleteSourceBranch;
        const shouldTransitionWorkItems = completeMergeStore.getCompletionOptions().transitionWorkItems;
        const shouldSquashMerge = completeMergeStore.getCompletionOptions().squashMerge;
        const canBypassPolicy = completeMergeStore.canBypassPolicy();
        const canTransitionWorkItems = completeMergeStore.canTransitionWorkItems();
        const shouldBypassPolicy = !this.props.autoComplete && completeMergeStore.shouldBypassPolicy();
        const canDeleteSourceBranch = completeMergeStore.canDeleteSourceBranch();
        const cannotDeleteReasonHint = completeMergeStore.getCannotDeleteReasonHint();
        const sourceFriendlyName = completeMergeStore.getSourceFriendlyName();
        const squashMergeWarning = completeMergeStore.getSquashMergeWarning();

        const policyWarning = getPolicyWarning(Flux.instance().storesHub.clientPolicyEvaluationStore.state.clientPolicyEvaluations);
        const policiesLoading = Flux.instance().storesHub.clientPolicyEvaluationStore.isLoading();

        let workItemTransitionWarning: WorkItemTransitionWarning = null;
        if (!FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessVersionControlDisableWITValidationWarning, false)) {
            workItemTransitionWarning = Flux.instance().storesHub.relatedWorkItemsStore.getWorkItemTransitionWarning();
        }

        return {
            squashPolicySetting,
            policyWarning,
            shouldSquashMerge,
            squashMergeWarning,
            workItemTransitionWarning,
            shouldDeleteSourceBranch,
            shouldTransitionWorkItems,
            canTransitionWorkItems,
            mergeDescription,
            mergeDescriptionError,
            mergeTitle,
            loading:
                policiesLoading ||
                Flux.instance().storesHub.userPreferencesStore.isLoading() ||
                Flux.instance().storesHub.relatedWorkItemsStore.isLoading() ||
                Flux.instance().storesHub.pullRequestDetailStore.isLoading() ||
                Flux.instance().storesHub.pullRequestDetailStore.sourceRefStatusIsLoading() ||
                Flux.instance().storesHub.pullRequestCompletionOptionsStore.isLoading(),
            shouldBypassPolicy,
            canBypassPolicy,
            bypassReason,
            canDeleteSourceBranch,
            cannotDeleteReasonHint,
            sourceFriendlyName,
            completionOptions,
        };
    }

    private _onSquashMergeChange = (ev?: React.FormEvent<HTMLElement>, isChecked?: boolean) => {
        Flux.instance().actionCreator.userPreferenceActionCreator.updateSquashMerge(isChecked);
    }

    private _onDeleteSourceBranchChange = (ev?: React.FormEvent<HTMLElement>, isChecked?: boolean) => {
        Flux.instance().actionCreator.userPreferenceActionCreator.updateDeleteSourceBranch(isChecked);
    }

    private _onTransitionWorkItemsChange = (ev?: React.FormEvent<HTMLElement>, isChecked?: boolean) => {
        Flux.instance().actionCreator.userPreferenceActionCreator.updateTransitionWorkItems(isChecked);
    }

    private _onMergeDescriptionChange = (value) => {
        Flux.instance().actionCreator.completeMergeActionCreator.updateMergeDescription(value);
    }

    private _onMergeTitleChange = (value) => {
        Flux.instance().actionCreator.completeMergeActionCreator.updateMergeTitle(value);
    }

    private _onBypassPolicyChange = (ev?: React.FormEvent<HTMLElement>, isChecked?: boolean) => {
        Flux.instance().actionCreator.completeMergeActionCreator.updateBypassPolicy(isChecked);
    }

    private _onBypassReasonChange = (value) => {
        Flux.instance().actionCreator.completeMergeActionCreator.updateBypassReason(value);
    }
}

function getPolicyWarning(clientPolicyEvaluations: ClientPolicyEvaluation[]): string {
    const rejectedPolicyEvaluations = clientPolicyEvaluations
        .filter(x => x.policyEvaluation.status !== PolicyEvaluationStatus.Approved && x.policyEvaluation.isBlocking);

    if (rejectedPolicyEvaluations.length === 0) {
        return null;
    }

    if (rejectedPolicyEvaluations.length === 1) {
        return rejectedPolicyEvaluations[0].policyEvaluation.displayText;
    }

    return format(VCResources.PullRequest_CompleteMergeDialog_ByPassPolicyWarning, rejectedPolicyEvaluations.length);
}
