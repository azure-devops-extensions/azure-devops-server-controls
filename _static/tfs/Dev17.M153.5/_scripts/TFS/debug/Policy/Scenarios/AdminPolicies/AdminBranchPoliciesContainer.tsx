// css
import "VSS/LoaderPlugins/Css!Policy/Scenarios/AdminPolicies/AdminBranchPoliciesContainer";
// libs
import * as React from "react";
import * as ReactDOM from "react-dom";
import { autobind } from "OfficeFabric/Utilities";
// contracts
import { MessageTarget } from "Policy/Scenarios/AdminPolicies/Stores/MessageStore";
import { IBuildDefinitionMap } from "Policy/Scenarios/AdminPolicies/Stores/BuildDefinitionStore";
import { PolicyConfiguration } from "Policy/Scripts/Generated/TFS.Policy.Contracts";
import * as PolicyTypes from "Policy/Scripts/PolicyTypes";
import { DefinitionReference } from "TFS/Build/Contracts";
import { GitStatusContext } from "TFS/VersionControl/Contracts";
// controls
import { Fabric, IFabricProps } from "OfficeFabric/Fabric";
import { Checkbox } from "OfficeFabric/Checkbox";
import { AdminPoliciesCommandBar } from "Policy/Scenarios/AdminPolicies/AdminPoliciesCommandBar";
import { CommandButton } from "OfficeFabric/Button";
import { AdminPoliciesTitle } from "Policy/Scenarios/AdminPolicies/AdminPoliciesTitle";
import { ApproverCountPolicy } from "Policy/Scenarios/AdminPolicies/ApproverCountPolicy";
import { AutomaticReviewersPolicyPanelContainer } from "Policy/Scenarios/AdminPolicies/AutomaticReviewersPolicyPanelContainer";
import { AutomaticReviewersPolicySectionContainer } from "Policy/Scenarios/AdminPolicies/AutomaticReviewersPolicySectionContainer";
import { BuildPolicyPanelContainer } from "Policy/Scenarios/AdminPolicies/BuildPolicyPanelContainer";
import { BuildPolicySection } from "Policy/Scenarios/AdminPolicies/BuildPolicySection";
import { CommentRequirementsPolicy } from "Policy/Scenarios/AdminPolicies/CommentRequirementsPolicy";
import { MergeStrategyPolicy } from "Policy/Scenarios/AdminPolicies/MergeStrategyPolicy";
import { StatusPolicyPanelContainer } from "Policy/Scenarios/AdminPolicies/StatusPolicyPanelContainer";
import { StatusPolicySectionContainer } from "Policy/Scenarios/AdminPolicies/StatusPolicySectionContainer";
import { WorkItemLinkingPolicy } from "Policy/Scenarios/AdminPolicies/WorkItemLinkingPolicy";
import { DeletePolicyDialog } from "Policy/Scenarios/AdminPolicies/DeletePolicyDialog";
import { SaveProgressModal } from "Policy/Scenarios/AdminPolicies/SaveProgressModal";
import { FormatComponent } from "VSSPreview/Flux/Components/Format";
import { MessageListContainer } from "Policy/Scenarios/AdminPolicies/MessageListContainer";
import { Link } from "OfficeFabric/Link";
// scenario
import { Flux, StoresHub } from "Policy/Scenarios/AdminPolicies/Flux";
import * as Resources from "Policy/Scripts/Resources/TFS.Resources.Policy";

export interface AdminBranchPoliciesContainerProps extends React.HTMLProps<HTMLDivElement | Fabric | AdminBranchPoliciesContainer> {
    flux: Flux;
}

export interface AdminBranchPoliciesContainerState {
    // Strings for top-of-page breadcrumb
    projectName?: string;
    repositoryName?: string;
    friendlyBranchName?: string;
    isWildcardRef?: boolean;

    // URL for "Security page" link
    securityPageUrl?: string;

    // For building link to security page
    repositoryId?: string;

    // User has no permission to edit
    readonlyMode?: boolean;

    // Build definitions
    buildDefinitionsById?: IBuildDefinitionMap,
    noDefinitionsExist?: boolean;

    // Local policy configs
    localPolicyConfigs?: PolicyConfiguration[];

    // Pull request statuses
    statuses?: GitStatusContext[];

    // Local policies have unsaved changes
    hasLocalChanges?: boolean;

    // Save operation(s) are in progress and have not yet returned
    saveInProgress?: boolean;
}

/**
 * Top-level control which contains the admin page for branch policies.
 */
export class AdminBranchPoliciesContainer extends React.Component<AdminBranchPoliciesContainerProps, AdminBranchPoliciesContainerState> {

    public static attachToDOM(container: HTMLElement, props: AdminBranchPoliciesContainerProps)
        : React.Component<AdminBranchPoliciesContainerProps, AdminBranchPoliciesContainerState> {
        return ReactDOM.render(
            <AdminBranchPoliciesContainer {...props as any} />,
            container
        ) as React.Component<AdminBranchPoliciesContainerProps, AdminBranchPoliciesContainerState>;
    }

    constructor(props: AdminBranchPoliciesContainerProps) {
        super(props);

        this.state = this._getStateFromStores();
    }

    // Note that ':' is not legal in git ref names
    private static readonly branchScopeRegex = /:refs\/heads\/(.+)$/;

    public render(): JSX.Element {

        let { flux, ...htmlProps } = this.props;

        const { readonlyMode, localPolicyConfigs, hasLocalChanges, friendlyBranchName, isWildcardRef, saveInProgress, } =
            this.state;

        // Props which are common to all policy components
        const commonPolicyComponentProps = {
            configs: localPolicyConfigs,
            readonlyMode: readonlyMode,
            createLocalPolicyConfig: flux.actionCreator.createLocalPolicyConfig,
            updateLocalPolicyConfig: flux.actionCreator.updateLocalPolicyConfig,
        };

        const disableAddBuildReason: string = this.state.noDefinitionsExist ? Resources.NoBuildDefinitions : null;

        const saveAndDiscardDisabled = readonlyMode || !hasLocalChanges;

        return (
            <Fabric
                className="admin-branch-policies-container"
                {...htmlProps as IFabricProps}>

                {/* Page header / breadcrumb / command bar */}

                <header>
                    <AdminPoliciesTitle
                        className="admin-policies-title"
                        projectName={this.state.projectName}
                        repositoryName={this.state.repositoryName}
                        friendlyBranchName={this.state.friendlyBranchName} />

                    <AdminPoliciesCommandBar
                        className="admin-policies-command-bar ms-borderColor-neutralTertiaryAlt"
                        disabled={saveAndDiscardDisabled}
                        onSaveAll={this._saveOnClick}
                        onDiscardAll={this._cancelOnClick} />
                </header>

                {/* Render panels so they are mounted before containers that could open them */}

                <BuildPolicyPanelContainer flux={this.props.flux} />
                <AutomaticReviewersPolicyPanelContainer flux={this.props.flux} />
                <StatusPolicyPanelContainer flux={this.props.flux} />

                {/* Begin scrollable region of page */}

                <div className="admin-branch-policies-scrollable-region" data-is-scrollable="true">

                    {/* Message center -- page level messages */}

                    <MessageListContainer flux={this.props.flux} messageTarget={MessageTarget.page} />

                    <h3 className="branch-policy-heading">{isWildcardRef ? Resources.ProtectBranchFolderText : Resources.ProtectOneBranchText}</h3>

                    <div className="policy-details">
                        <div className="policy-details-bullet">{Resources.ProtectBranchDetail1}</div>
                        <div className="policy-details-bullet">{Resources.ProtectBranchDetail2}</div>
                        <FormatComponent
                            elementType="div"
                            className="policy-details-bullet"
                            format={Resources.ProtectBranchDetail3}
                        >
                            <Link className="info-link branch-page-link" href={this.state.securityPageUrl}>{Resources.SecurityPage}</Link>
                        </FormatComponent>
                    </div>

                    <ApproverCountPolicy
                        {...commonPolicyComponentProps} />

                    <WorkItemLinkingPolicy
                        {...commonPolicyComponentProps} />

                    <CommentRequirementsPolicy
                        {...commonPolicyComponentProps} />

                    <MergeStrategyPolicy
                        {...commonPolicyComponentProps} />

                    <BuildPolicySection
                        configs={localPolicyConfigs}
                        readonlyMode={readonlyMode}
                        disableAddReason={disableAddBuildReason}
                        buildDefinitionsById={this.state.buildDefinitionsById}
                        updateLocalPolicyConfig={flux.actionCreator.updateLocalPolicyConfig}
                        showPolicyEditDialog={flux.actionCreator.showBuildPolicyEditDialog}
                        showPolicyDeleteDialog={flux.actionCreator.showPolicyDeleteDialog} />

                    <StatusPolicySectionContainer
                        identityStore={flux.storesHub.identityStore}
                        configs={localPolicyConfigs}
                        readonlyMode={readonlyMode}
                        updateLocalPolicyConfig={flux.actionCreator.updateLocalPolicyConfig}
                        showPolicyEditDialog={flux.actionCreator.showStatusPolicyEditDialog}
                        showPolicyDeleteDialog={flux.actionCreator.showPolicyDeleteDialog} />

                    <AutomaticReviewersPolicySectionContainer
                        identityStore={flux.storesHub.identityStore}
                        configs={localPolicyConfigs}
                        readonlyMode={readonlyMode}
                        updateLocalPolicyConfig={flux.actionCreator.updateLocalPolicyConfig}
                        showPolicyEditDialog={flux.actionCreator.showAutomaticReviewersPolicyEditDialog}
                        showPolicyDeleteDialog={flux.actionCreator.showPolicyDeleteDialog} />
                </div>

                <DeletePolicyDialog showPolicyDeleteDialog={this.props.flux.actionsHub.showPolicyDeleteDialog} />
                <SaveProgressModal isOpen={saveInProgress} />
            </Fabric>
        );
    }

    @autobind
    protected _dismissMessage(messageId: number): void {
        this.props.flux.actionCreator.dismissMessages(messageId);
    }

    @autobind
    private _saveOnClick(ev: React.MouseEvent<HTMLButtonElement>): void {
        this.props.flux.actionCreator.saveAllLocalPolicyConfigsToServer();
    }

    @autobind
    private _cancelOnClick(ev: React.MouseEvent<HTMLButtonElement>): void {
        this.props.flux.actionCreator.abandonAllLocalPolicyConfigChanges();
    }

    public componentDidMount(): void {
        this.props.flux.storesHub.adminPoliciesHubStore.addChangedListener(this._storesOnChanged);
        this.props.flux.storesHub.buildDefinitionStore.addChangedListener(this._storesOnChanged);
        this.props.flux.storesHub.policyConfigStore.addChangedListener(this._storesOnChanged);
        this.props.flux.storesHub.messageStore.addChangedListener(this._storesOnChanged);
        this.props.flux.storesHub.identityStore.addChangedListener(this._storesOnChanged);
    }

    public componentWillUnmount(): void {
        this.props.flux.storesHub.identityStore.removeChangedListener(this._storesOnChanged);
        this.props.flux.storesHub.messageStore.removeChangedListener(this._storesOnChanged);
        this.props.flux.storesHub.policyConfigStore.removeChangedListener(this._storesOnChanged);
        this.props.flux.storesHub.buildDefinitionStore.removeChangedListener(this._storesOnChanged);
        this.props.flux.storesHub.adminPoliciesHubStore.removeChangedListener(this._storesOnChanged);
    }

    @autobind
    private _storesOnChanged(): void {
        this.setState(this._getStateFromStores());
    }

    private static readonly policyTypesForMainPageSaveButton: string[] = [
        PolicyTypes.ApproverCount.Id,
        PolicyTypes.CommentRequirements.Id,
        PolicyTypes.MergeStrategy.Id,
        PolicyTypes.WorkItemLinking.Id,
    ];

    private _getStateFromStores(): AdminBranchPoliciesContainerState {

        // adminPoliciesHubStore
        const {
            readonlyMode,
            projectName,
            friendlyBranchName,
            isWildcardRef,
            securityPageUrl,
            repositoryName,
            repositoryId,
        } = this.props.flux.storesHub.adminPoliciesHubStore;

        // buildDefinitionStore
        const {
            buildDefinitionsById,
            noDefinitionsExist,
        } = this.props.flux.storesHub.buildDefinitionStore;

        // policyConfigStore
        const {
            localPolicyConfigs,
            saveInProgress,
        } = this.props.flux.storesHub.policyConfigStore;

        const hasLocalChanges = this.props.flux.storesHub.policyConfigStore
            .hasLocalChanges(AdminBranchPoliciesContainer.policyTypesForMainPageSaveButton);

        return {
            projectName: projectName,
            repositoryName: repositoryName,
            friendlyBranchName: friendlyBranchName,
            isWildcardRef: isWildcardRef,

            securityPageUrl: securityPageUrl,

            repositoryId: repositoryId,

            readonlyMode: readonlyMode,

            buildDefinitionsById: buildDefinitionsById,
            noDefinitionsExist: noDefinitionsExist,

            localPolicyConfigs: localPolicyConfigs,
            hasLocalChanges: hasLocalChanges,
            saveInProgress: saveInProgress,
        };
    }
}
