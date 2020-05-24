import * as React from "react";

import { Flux } from "VersionControl/Scenarios/PullRequestDetail/View/PullRequestDetail.Flux";

// stores
import { PullRequestAutoCompleteStore, AutoCompleteStoreState } from "VersionControl/Scenarios/PullRequestDetail/Stores/PullRequestAutoCompleteStore";

import { ClientPolicyEvaluation } from "VersionControl/Scenarios/PullRequestDetail/Policy/ClientPolicyEvaluation";
import { IPullRequest } from "VersionControl/Scripts/Stores/PullRequestReview/PullRequestDetailStore";

// contracts
import * as IdentityImage from "Presentation/Scripts/TFS/Components/IdentityImage";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_String from "VSS/Utils/String";
import { IdentityRef } from "VSS/WebApi/Contracts";

// components
import { DefaultButton } from "OfficeFabric/Button";
import { IColumn, ColumnActionsMode } from "OfficeFabric/DetailsList";
import { List } from "OfficeFabric/List";
import { TooltipHost, DirectionalHint, TooltipOverflowMode } from "VSSUI/Tooltip";
import * as Activity from "VersionControl/Scripts/Components/PullRequestReview/Activities/Activity";
import { ConflictList } from "VersionControl/Scripts/Components/PullRequestReview/ConflictList";
import { PullRequestCallout } from "VersionControl/Scripts/Components/PullRequestReview/PullRequestCallout";
import { VssDetailsList, VssDetailsListPresentationStyles } from "VSSUI/VssDetailsList";

import { autobind, css } from "OfficeFabric/Utilities";
import { FormattedComponent } from "VersionControl/Scripts/Utils/Format";

import "VSS/LoaderPlugins/Css!VersionControl/AutoCompleteCallout";

export interface AutoCompleteCalloutContainerProps {
    pullRequest: IPullRequest;
    tfsContext: TfsContext;
    autoCompleter: IdentityRef;
    hasPermissionToCancelAutoComplete: boolean;
    cancelAutoComplete(): void;
}

export interface AutoCompleteCalloutState {
    blockingEvaluations: ClientPolicyEvaluation[];
}

export class AutoCompleteCalloutContainer extends React.Component<AutoCompleteCalloutContainerProps, AutoCompleteCalloutState> {
    constructor(props: AutoCompleteCalloutComponentProps) {
        super(props);
        this.state = this._getStateFromStore();
    }

    public componentDidMount(): void {
        Flux.instance().storesHub.autoCompleteStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.clientPolicyEvaluationStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount(): void {
        Flux.instance().storesHub.autoCompleteStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.clientPolicyEvaluationStore.removeChangedListener(this._onChange);
    }

    @autobind
    private _onChange() {
        this.setState(this._getStateFromStore());
    }

    private _getStateFromStore(): AutoCompleteCalloutState {
        const clientPolicyEvaluations = Flux.instance().storesHub.clientPolicyEvaluationStore.state.clientPolicyEvaluations;
        const blockingEvaluations = Flux.instance().storesHub.autoCompleteStore.getClientPolicyEvaluationsBlockingAutoComplete(clientPolicyEvaluations);

        return { blockingEvaluations };
    }

    public render(): JSX.Element {
        const calloutProps = {
            ...this.props,
            blockingEvaluations: this.state.blockingEvaluations,
        };

        return <AutoCompleteCallout {...calloutProps}/>;
    }
}

export interface AutoCompleteCalloutComponentProps {
    pullRequest: IPullRequest;
    tfsContext: TfsContext;
    autoCompleter: IdentityRef;
    hasPermissionToCancelAutoComplete: boolean;
    cancelAutoComplete(): void;
    blockingEvaluations: ClientPolicyEvaluation[];
}

export class AutoCompleteCallout extends React.Component<AutoCompleteCalloutComponentProps, {}> {

    public render(): JSX.Element {
        const { pullRequest, tfsContext, autoCompleter, blockingEvaluations } = this.props;

        const autoCompleterDisplayName =
            (pullRequest.autoCompleteSetBy.displayName)
            // This shouldn't happen
            || VCResources.PullRequest_PullRequestDetailsStatusUnKnown;

        const autoCompleteStatus: string = blockingEvaluations && blockingEvaluations.length > 0 ?
             Utils_String.format(VCResources.PullRequest_CallToAction_AutoComplete_SetBy_WithCriteria, autoCompleterDisplayName)
             : Utils_String.format(VCResources.PullRequest_CallToAction_AutoComplete_SetBy, autoCompleterDisplayName);

        const completerImage = Activity.tfIdImage(tfsContext, autoCompleter, IdentityImage.imageSizeSmall);

        const targetBranchHtmlEscaped = Utils_String.htmlEncode(pullRequest.targetFriendlyName);
        const sourceBranchHtmlEscaped = Utils_String.htmlEncode(pullRequest.sourceFriendlyName);

        const completionOptions = pullRequest.pullRequestContract().completionOptions;

        const willSquash: boolean = completionOptions && completionOptions.squashMerge;
        const willDelete: boolean = completionOptions && completionOptions.deleteSourceBranch;
        const willTransition: boolean = completionOptions && completionOptions.transitionWorkItems;

        return (
            <PullRequestCallout buttons={[this._cancelAutoCompleteButton()]} className="auto-complete">
                <div key="callout" className="vc-pullrequest-callout-container">
                    <div className="vc-pullrequest-callout-text" key="callout">
                        <span className="space-right">{completerImage}</span>
                        {autoCompleteStatus}
                    </div>
                    <List
                        key="policies-list"
                        className="policies-list"
                        items={blockingEvaluations}
                        onRenderCell={this._onRenderCell} />
                    <FormattedComponent
                        format={VCResources.PullRequest_CallToAction_AutoCompletion_Options}
                        className="callout-details"
                        elementType="div"
                        key="details">
                        {[
                            <strong key="squash">{willSquash ? VCResources.SquashedLowerCase : VCResources.MergedLowerCase}</strong>,
                            targetBranchHtmlEscaped,
                            sourceBranchHtmlEscaped,
                            <strong key="delete">{willDelete ? VCResources.DeletedLowerCase : VCResources.RetainedLowerCase}</strong>,
                            <strong key="transition">{willTransition ? VCResources.CompletedLowerCase : VCResources.UnchangedLowerCase}</strong>,
                        ]}
                    </FormattedComponent>
                </div>
            </PullRequestCallout>
        );
    }

    private _cancelAutoCompleteButton(): JSX.Element {
        return this.props.hasPermissionToCancelAutoComplete &&
            <DefaultButton
                key="cancelAutoComplete"
                onClick={this.props.cancelAutoComplete}>
                {VCResources.CancelAutoComplete}
            </DefaultButton>;
    }

    @autobind
    private _onRenderCell(policyEvaluation: ClientPolicyEvaluation): JSX.Element {
        const statusText = policyEvaluation.policyEvaluation.displayText;
        const displayName = policyEvaluation.policyEvaluation.displayName;
        return <div className="policies-list-item">
             <TooltipHost
                hostClassName={css("policy-name", "ellide-overflow")}
                content={displayName}
                directionalHint={DirectionalHint.bottomCenter}
                overflowMode={TooltipOverflowMode.Self}>
                <span>{displayName}</span>
            </TooltipHost>
            <TooltipHost
                hostClassName={css("policy-status", "ellide-overflow")}
                content={statusText}
                directionalHint={DirectionalHint.bottomCenter}
                overflowMode={TooltipOverflowMode.Self}>
                <span>{statusText}</span>
            </TooltipHost>
        </div>;
    }
}
