/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ErrorComponent } from "DistributedTaskControls/SharedControls/ErrorComponent/ErrorComponent";
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";
import { BooleanInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/BooleanInputComponent";
import { PermissionIndicatorSource } from "DistributedTaskControls/Common/Telemetry";
import { TooltipIfOverflow } from "DistributedTaskControls/Components/TooltipIfOverflow";

import { RetentionPolicyActionsCreator } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/RetentionTab/RetentionPolicyActionsCreator";
import { IRetentionPolicyState, RetentionPolicyStore } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/RetentionTab/RetentionPolicyStore";
import { DefinitionSettingsStore } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionSettingsStore";
import { CoreDefinitionStore } from "PipelineWorkflow/Scripts/Editor/Definition/CoreDefinitionStore";
import { DeployEnvironmentStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentStore";
import { PermissionHelper } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";
import { PermissionIndicator } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionIndicator";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as Utils_String from "VSS/Utils/String";
import { HubsService } from "VSS/Navigation/HubsService";
import { Uri } from "VSS/Utils/Url";
import * as Utils_Html from "VSS/Utils/Html";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/ContainerTabs/RetentionTab/RetentionPolicyView";

export class RetentionPolicyView extends Base.Component<Base.IProps, IRetentionPolicyState> {

    public componentWillMount() {
        this._actionCreator = ActionCreatorManager.GetActionCreator<RetentionPolicyActionsCreator>(RetentionPolicyActionsCreator, this.props.instanceId);
        this._store = StoreManager.GetStore<RetentionPolicyStore>(RetentionPolicyStore, this.props.instanceId);
        this._definitionSettingsStore = StoreManager.GetStore<DefinitionSettingsStore>(DefinitionSettingsStore);
        this._coreDefinitionStore = StoreManager.GetStore<CoreDefinitionStore>(CoreDefinitionStore);
        this._environmentStore = StoreManager.GetStore<DeployEnvironmentStore>(DeployEnvironmentStore, this.props.instanceId);

        this._store.addChangedListener(this._onchange);
        this.setState(this._store.getState());
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this._onchange);
    }

    public render(): JSX.Element {
        let environmentName = this._store.getEnvironmentName();
        let headerText = Utils_String.format(Resources.RetentionPolicyHeaderText, environmentName);
        const releaseDefinitionFolderPath = this._coreDefinitionStore.getState().folderPath;
        const releaseDefinitionId = this._coreDefinitionStore.getState().id;
        const environmentId = this._environmentStore.getEnvironmentId();

        return (
            <PermissionIndicator
                securityProps={PermissionHelper.createEditEnvironmentSecurityProps(releaseDefinitionFolderPath, releaseDefinitionId, environmentId)}
                overridingSecurityProps={PermissionHelper.createEditEnvironmentOverrideSecurityProps(releaseDefinitionFolderPath, releaseDefinitionId)}
                message={Resources.EditEnvironmentPermissionMessage}
                telemetrySource={PermissionIndicatorSource.retentionTab}>

                <div className="cd-environment-retention-policy-container">

                    <TooltipIfOverflow tooltip={headerText} targetElementClassName="retention-policy-header">
                        <div className="retention-policy-header" role="heading" aria-level={1}>
                            {headerText}
                        </div>
                    </TooltipIfOverflow>

                    {this._getDaysToKeepInputView()}

                    {this._getReleaseCountInputView()}

                    {this._getAdditionalOptionsView()}

                    <div className="cd-environment-retention-seperator"></div>


                    {this._getDefaultRetentionPolicyLinkFooter()}

                </div>

            </PermissionIndicator>
        );
    }

    private _onchange = () => {
        this.setState(this._store.getState());
    }

    private _getDaysToKeepInputView(): JSX.Element {
        let maximumRetainDays = this._getMaximumRetainDays();
        let infoProps = {
            calloutContentProps: {
                calloutMarkdown: Utils_String.format(Resources.RetentionDaysToRetainInfoText, maximumRetainDays, RetentionPolicyView._learnMoreLink)
            }
        };
        return (
            <div className="retention-days-container retention-input-container">
                <div className="days-count-input retention-input">
                    <StringInputComponent
                        required={true}
                        label={Resources.RetentionDaysCountTitle}
                        ariaDescription={Resources.RetentionDaysToRetainDescription}
                        value={this.state.daysToKeep.toString()}
                        cssClass="retention-input-box"
                        errorMessage={this._store.getDaysToKeepErrorMessage()}
                        onValueChanged={this._handleDaysToKeepUpdate}
                        infoProps={infoProps} />
                </div>
            </div>);
    }

    private _getReleaseCountInputView(): JSX.Element {
        let minimumReleaseRetainCount = this._getMinimumRetainReleases();
        let infoProps = {
            calloutContentProps: {
                calloutMarkdown: Utils_String.format(Resources.RetentionReleaseCountInfoText, minimumReleaseRetainCount, RetentionPolicyView._learnMoreLink)
            }
        };
        return (
            <div className="retention-release-count-container retention-input-container">
                <div className="release-count-input retention-input">
                    <StringInputComponent
                        required={true}
                        label={Resources.RetentionReleaseCountTitle}
                        ariaDescription={Resources.RetentionReleasesToKeepDescription}
                        value={this.state.releasesToKeep.toString()}
                        cssClass="retention-input-box"
                        infoProps={infoProps}
                        errorMessage={this._store.getReleasesToKeepErrorMessage()}
                        onValueChanged={this._handleReleasesToKeepUpdate} />
                </div>
            </div>);
    }

    private _getAdditionalOptionsView(): JSX.Element {
        let infoProps = {
            calloutContentProps: {
                calloutMarkdown: Utils_String.format(Resources.RetentionRetainArtifactInfoText, RetentionPolicyView._learnMoreLink)
            }
        };
        return (
            <div className="additional-options-container retention-input-container">
                <BooleanInputComponent
                    cssClass="retain-artifact-checkbox"
                    value={this.state.retainBuild}
                    label={Resources.RetentionAssocitedArtifactsCheckboxLabel}
                    ariaDescription={Resources.RetentionRetainArtifactDescription}
                    infoProps={infoProps}
                    onValueChanged={this._handleRetainBuildUpdate}
                />
            </div>);
    }

    private _getDefaultRetentionPolicyLinkFooter(): JSX.Element {
        let footerHtml = Utils_String.format(Resources.RetentionSettingsFooterText, this._getDefaultRetentionPolicyLink());
        let normalizedFooterHtml = Utils_Html.HtmlNormalizer.normalizeStripAttributes(footerHtml, null, ["target"]);
        
        /* tslint:disable:react-no-dangerous-html */
        return (
            <div className="environment-retention-policy-settings-link">
                <i className="bowtie-icon bowtie-settings-gear-outline retention-tab-no-color-icon"></i>
                <span className="retention-settings-link-footer-text" dangerouslySetInnerHTML={this._renderHtml(normalizedFooterHtml)}></span>
            </div>);
        /* tslint:enable:react-no-dangerous-html */
    }

    private _renderHtml(html: string) {
        return {
            __html: html
        };
    }

    private _handleDaysToKeepUpdate = (newValue: string) => {
        this._actionCreator.updateDaysToKeep(newValue);
    }

    private _getDefaultRetentionPolicyLink(): string {
        const hubService = new HubsService();
        const hub = hubService.getHubById(RetentionPolicyView._releaseAdminHubContributionId);
        if (hub) {
            let uri = Uri.parse(hub.uri);
            return uri.absoluteUri;
        }
        return Utils_String.empty;
    }

    private _handleReleasesToKeepUpdate = (newValue: string) => {
        this._actionCreator.updateReleasesToKeep(newValue);
    }

    private _handleRetainBuildUpdate = (newValue: boolean) => {
        this._actionCreator.updateRetainBuild(newValue);
    }

    private _getMaximumRetainDays(): number {
        return this._definitionSettingsStore.getMaximumRetentionPolicy().daysToKeep;
    }

    private _getMinimumRetainReleases(): number {
        return this._definitionSettingsStore.getMaximumRetentionPolicy().releasesToKeep;
    }

    private _actionCreator: RetentionPolicyActionsCreator;
    private _store: RetentionPolicyStore;
    private _definitionSettingsStore: DefinitionSettingsStore;
    private _coreDefinitionStore: CoreDefinitionStore;
    private _environmentStore: DeployEnvironmentStore;

    private static readonly _learnMoreLink = "https://go.microsoft.com/fwlink/?linkid=852495";
    private static readonly _releaseAdminHubContributionId = "ms.vss-releaseManagement-web.release-project-admin-hub";
}
