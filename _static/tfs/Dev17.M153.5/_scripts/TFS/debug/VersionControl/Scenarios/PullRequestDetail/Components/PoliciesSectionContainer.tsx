import * as React from "react";

import { List } from "OfficeFabric/List";
import { Spinner } from "OfficeFabric/Spinner";
import { autobind, Async } from "OfficeFabric/Utilities";

import { PolicyEvaluationStatus } from "Policy/Scripts/Generated/TFS.Policy.Contracts";
import { PullRequestStatusContributions } from "VersionControl/Scenarios/PullRequestDetail/Components/PullRequestStatusContributions";
import { PullRequestStatusesListItem } from "VersionControl/Scenarios/PullRequestDetail/Components/PullRequestStatusesListItem";
import { StatusPolicyEvaluation } from "VersionControl/Scenarios/PullRequestDetail/Contracts/PullRequestPolicyEvaluation";
import { ClientPolicyEvaluation, ClientPolicyAction } from "VersionControl/Scenarios/PullRequestDetail/Policy/ClientPolicyEvaluation";
import { Flux } from "VersionControl/Scenarios/PullRequestDetail/View/PullRequestDetail.Flux";
import { FpsLink } from "VersionControl/Scenarios/Shared/FpsLink";

import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { IPullRequest } from "VersionControl/Scripts/Stores/PullRequestReview/PullRequestDetailStore";

import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { MoreActionsButton } from "VSSUI/ContextualMenuButton";

export interface PoliciesSectionContainerState {
    policiesLoading: boolean;
    clientEvaluations: ClientPolicyEvaluation[];
    hasDynamicPolicy: boolean;
    pullRequest: IPullRequest;
    hasPermissionToPerformPolicyActions: boolean;
    statusContributions: PullRequestStatusContributions;
}

export class PoliciesSectionContainer extends React.Component<{}, PoliciesSectionContainerState>
{
    constructor(props: {}) {
        super(props);

        this.state = this._getStateFromStores();
    }

    public render(): JSX.Element {
        return <DynamicPoliciesSection
            {...this.state}
            performPolicyAction={this._performPolicyAction}
            updateDynamicPolicies={this._updateDynamicPolicy} />;
    }

    public componentDidMount() {
        Flux.instance().storesHub.clientPolicyEvaluationStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.pullRequestDetailStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.permissionsStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.pullRequestStatusContributionsStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount() {
        Flux.instance().storesHub.clientPolicyEvaluationStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.pullRequestDetailStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.permissionsStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.pullRequestStatusContributionsStore.removeChangedListener(this._onChange);
    }

    @autobind
    private _performPolicyAction(actionId: string, actionArg: string): void {
        Flux.instance().actionCreator.pullRequestActionCreator.performPolicyAction(actionId, actionArg);
    }

    @autobind
    private _updateDynamicPolicy(): void {
        Flux.instance().actionCreator.clientPoliciesActionCreator.updateDynamicPolicies();
    }

    @autobind
    private _onChange(): void {
        this.setState(this._getStateFromStores());
    }

    private _getStateFromStores(): PoliciesSectionContainerState {
        const store = Flux.instance().storesHub.clientPolicyEvaluationStore;
        return {
            policiesLoading: store.isLoading(),
            clientEvaluations: store.state.clientPolicyEvaluations,
            hasDynamicPolicy: store.state.clientPolicyEvaluations.some(p => p.hasDynamicStatus),
            pullRequest: Flux.instance().storesHub.pullRequestDetailStore.getPullRequestDetail(),
            hasPermissionToPerformPolicyActions: Flux.instance().storesHub.permissionsStore.getPermissions().usePolicyActions,
            statusContributions: Flux.instance().storesHub.pullRequestStatusContributionsStore.getStatusContribution(),
        };
    }
}

export interface PoliciesSectionProps {
    policiesLoading: boolean;
    showSpinner?: boolean;
    clientEvaluations: ClientPolicyEvaluation[];
    pullRequest: IPullRequest;
    hasPermissionToPerformPolicyActions: boolean;
    statusContributions: PullRequestStatusContributions;
    performPolicyAction(actionId: string, actionArg: string): void;
}

export interface DynamicPoliciesSectionProps extends PoliciesSectionProps {
    hasDynamicPolicy: boolean;
    updateDynamicPolicies(): void;
}

const policyUpdateInterval: number = 10000;

export class DynamicPoliciesSection extends React.PureComponent<DynamicPoliciesSectionProps> {
    private _timerID: number;
    private _async: Async;

    public constructor(props: DynamicPoliciesSectionProps) {
        super(props);
        this._async = new Async();
    }

    public componentDidMount() {
        if (this.props.hasDynamicPolicy) {
            this._timerID = this._async.setInterval(() => this._dynamicUpdate(), policyUpdateInterval);
        }
    }

    public componentDidUpdate() {
        if (!this._timerID && this.props.hasDynamicPolicy) {
            this._timerID = this._async.setInterval(() => this._dynamicUpdate(), policyUpdateInterval);
        }

        if (this._timerID && !this.props.hasDynamicPolicy) {
            this._async.clearInterval(this._timerID);
            this._timerID = null;
        }
    }

    public componentWillUnmount() {
        if (this._timerID) {
            this._async.clearInterval(this._timerID);
            this._timerID = null;
        }
    }

    public render(): JSX.Element {
        return <SpinnerPoliciesSection {...this.props} />;
    }

    @autobind
    private _dynamicUpdate() {
        this.props.updateDynamicPolicies();
    }
}

export interface SpinnerPoliciesSectionState {
    showSpinner: boolean;
}

const loadingSpinnerInterval: number = 750;

export class SpinnerPoliciesSection extends React.Component<PoliciesSectionProps, SpinnerPoliciesSectionState> {
    private _async: Async;
    private _loadingTimerId: number;

    constructor(props: PoliciesSectionProps) {
        super(props);
        this.state = { showSpinner: false };
        this._async = new Async();
    }

    public componentWillMount() {
        if (this.props.policiesLoading) {
            this._setTimeout();
        }
    }

    public componentWillUpdate(newProps: PoliciesSectionProps) {
        if (!this._loadingTimerId && newProps.policiesLoading) {
            this._setTimeout();
        }

        if (!newProps.policiesLoading) {
            if (this._loadingTimerId) {
                this._clearTimeout();
            }

            if (this.state.showSpinner) {
                this.setState({ showSpinner: false });
            }
        }
    }

    public componentWillUnmount() {
        if (this._loadingTimerId) {
            this._clearTimeout();
        }
    }

    private _showSpinner = (): void => {
        if (this._loadingTimerId && this.props.policiesLoading) {
            this.setState({ showSpinner: true });
            this._clearTimeout();
        }
    }

    private _setTimeout() {
        this._loadingTimerId = this._async.setTimeout(this._showSpinner, loadingSpinnerInterval);
    }

    private _clearTimeout() {
        this._async.clearTimeout(this._loadingTimerId);
        this._loadingTimerId = null;
    }

    public render() {
        return <PoliciesSection {...this.props} showSpinner={this.state.showSpinner} />;
    }
}

export class PoliciesSection extends React.Component<PoliciesSectionProps> {
    public render(): JSX.Element {
        if (this.props.clientEvaluations.length === 0 && !this.props.showSpinner) {
            return null;
        }

        const requiredPolicies = this.props.clientEvaluations.filter(e => e.policyEvaluation.isBlocking);
        const optionalPolicies = this.props.clientEvaluations.filter(e => !e.policyEvaluation.isBlocking);

        return (
            <div className="vc-pullrequest-leftpane-section">
                <div className="vc-pullrequest-leftpane-section-title">
                    <span role="heading" aria-level={2} id="merge-policy-section-title">{VCResources.PullRequest_MergePolicies_Section_Title}</span>
                </div>
                <div className="divider" />
                {this.props.showSpinner && <Spinner label={VCResources.PullRequest_MergePolicies_CheckingPolicies} />}
                <PoliciesSubSection {...this.props} clientEvaluations={requiredPolicies} heading={VCResources.PullRequest_Required} />
                <PoliciesSubSection {...this.props} clientEvaluations={optionalPolicies} heading={VCResources.PullRequest_Optional} />
            </div>
        );
    }
}

export interface PoliciesSubSectionProps extends PoliciesSectionProps {
    heading: string;
}

export class PoliciesSubSection extends React.PureComponent<PoliciesSubSectionProps> {
    public render(): JSX.Element {
        if (this.props.clientEvaluations.length === 0) {
            return null;
        }

        return (
            <div>
                <div className="vc-pullrequest-leftpane-section-subhead with-margin" role="heading" aria-level={3}>{this.props.heading}</div>
                <List
                    className="vc-pullrequest-merge-policy-status-list"
                    role="list"
                    items={this.props.clientEvaluations}
                    onRenderCell={this._renderPolicyListItem} />
                <List
                    className="visually-hidden"
                    role="list"
                    aria-live="polite"
                    aria-relevant={"additions removals" as any /* bad typing in react? */}
                    items={this.props.clientEvaluations}
                    onRenderCell={this._renderPolicyListItemTextOnly} />
            </div>
        );
    }

    @autobind
    private _renderPolicyListItem(clientEvaluation: ClientPolicyEvaluation): JSX.Element {
        const { latestStatus } = clientEvaluation.policyEvaluation as StatusPolicyEvaluation;

        if (latestStatus) {
            return (
                <PullRequestStatusesListItem
                    pullRequestStatus={latestStatus}
                    pullRequest={this.props.pullRequest}
                    displayName={clientEvaluation.policyEvaluation.displayText}
                    statusContributionIds={this.props.statusContributions.getContributionIds(latestStatus)}
                    hasPermissionToPerformPolicyActions={this.props.hasPermissionToPerformPolicyActions} />
            );
        }

        return <PolicyListItem
            key={clientEvaluation.policyEvaluation.evaluationId}
            hasPermissionToPerformPolicyActions={this.props.hasPermissionToPerformPolicyActions}
            evaluation={clientEvaluation}
            performPolicyAction={this.props.performPolicyAction} />;
    }

    @autobind
    private _renderPolicyListItemTextOnly(clientEvaluation: ClientPolicyEvaluation): JSX.Element {
        return <PolicyListItem
            key={clientEvaluation.policyEvaluation.evaluationId}
            evaluation={clientEvaluation}
            isTextOnly={true} />;
    }
}

export interface PolicyListItemProps {
    evaluation: ClientPolicyEvaluation;
    hasPermissionToPerformPolicyActions?: boolean;
    isTextOnly?: boolean;
    performPolicyAction?(actionId: string, actionArg: string): void;
}

export class PolicyListItem extends React.PureComponent<PolicyListItemProps> {
    public render(): JSX.Element {

        if (this.props.isTextOnly) {
            return (
                <div
                    role="listitem"
                    className="vc-pullrequest-merge-policy-status-item">
                    {this.props.evaluation.policyEvaluation.displayText}
                </div>
            );
        } else {
            return (
                <div
                    role="listitem"
                    className="vc-pullrequest-merge-policy-status-item">
                    <i className={getPolicyIconClass(this.props.evaluation.policyEvaluation.displayStatus)}
                        aria-label={this.props.evaluation.policyEvaluation.displayText} />
                    {this._statusTextElement(this.props.evaluation)}
                    <PopupMenuButton {...this.props} />
                </div>
            );
        }
    }

    private _statusTextElement(evaluation: ClientPolicyEvaluation): JSX.Element {
        if (evaluation.displayUrl) {
            return <FpsLink
                className="actionLink"
                href={evaluation.displayUrl}
                targetHubId={evaluation.displayUrlHubId}>
                {evaluation.policyEvaluation.displayText}
            </FpsLink>;
        }
        return <span className="statusText">{evaluation.policyEvaluation.displayText}</span>;
    }
}

export class PopupMenuButton extends React.PureComponent<PolicyListItemProps> {
    public render(): JSX.Element {
        if (!this.props.evaluation.actions
            || !this.props.evaluation.actions.length
            || !this.props.hasPermissionToPerformPolicyActions) {
            return null; // no actions available
        }

        return <MoreActionsButton
            className="more-policy-actions-button"
            title={VCResources.PullRequest_Policies_MoreActions}
            getItems={this._getMenuItems} />;
    }

    @autobind
    private _getMenuItems(): IContextualMenuItem[] {
        return this.props.evaluation.actions.map((menuItem, index) => {
            return {
                name: menuItem.text,
                key: "" + index,
                ariaLabel: menuItem.text,
                onClick: (event: React.MouseEvent<HTMLButtonElement>) => this._onClickActionMenuItem(menuItem),
            } as IContextualMenuItem;
        });
    }

    @autobind
    private _onClickActionMenuItem(policyAction: ClientPolicyAction) {
        if (policyAction && this.props.performPolicyAction) {
            this.props.performPolicyAction(policyAction.actionId, policyAction.actionArg);
        }
    }
}

function getPolicyIconClass(status: PolicyEvaluationStatus): string {

    switch (status) {
        case PolicyEvaluationStatus.Queued:
        case PolicyEvaluationStatus.NotApplicable:
            return "bowtie-icon bowtie-status-waiting";

        case PolicyEvaluationStatus.Running:
            return "bowtie-icon bowtie-play-fill";

        case PolicyEvaluationStatus.Approved:
            return "bowtie-icon bowtie-check";

        case PolicyEvaluationStatus.Rejected:
        case PolicyEvaluationStatus.Broken:
            return "bowtie-icon bowtie-math-multiply";

        default:
            return "bowtie-icon";
    }
}
