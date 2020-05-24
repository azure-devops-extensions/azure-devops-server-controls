// Copyright (c) Microsoft Corporation.  All rights reserved.

import * as React from "react";
import * as VSS from "VSS/VSS";
import * as Utils_String from "VSS/Utils/String";
import * as Events_Services from "VSS/Events/Services";
import { Component as BaseComponent, Props as IProps, State as IState } from "VSS/Flux/Component";

import { Dropdown, IDropdownOption, IDropdownState } from "OfficeFabric/Dropdown";
import { Checkbox } from "OfficeFabric/Checkbox";
import { Link } from "OfficeFabric/Link";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { css } from "OfficeFabric/Utilities";

import { Component as MarkdownComponent, IProps as IMarkdownComponentProps } from "DistributedTaskControls/Components/MarkdownRenderer";
import { CopyButton } from "DistributedTaskControls/Components/CopyButton";
import { IProps as InfoProps, Component as InfoButton } from "DistributedTaskControls/Components/InfoButton";
import { ICalloutContentProps } from "DistributedTaskControls/Components/CalloutComponent";
import { AgentPackagesStore, IAgentLatestPackage, getStore } from "DistributedTaskControls/Stores/AgentPackages";

import * as PATTokenActionCreator from "ReleasePipeline/Scripts/Common/Actions/PATTokenActionCreator";
import * as PATTokenStore from "ReleasePipeline/Scripts/Common/Stores/PATTokenStore";
import * as PerformanceTelemetry from "ReleasePipeline/Scripts/TFS.ReleaseManagement.PerformanceTelemetry";
import { PerfScenariosConstants } from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";
import * as DGUtils from "ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.Common.Utils";
import * as Resources from "ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline";
import "VSS/LoaderPlugins/Css!RM:ReleasePipeline/Scripts/Common/Components/AddTargetGuidance";

export interface IAddTargetGuidanceProps extends IProps {
    resourceName: string;
    resourceId: number;
    resourceType: string;
    copyScriptEnabled?: boolean;
    warningMessage?: string;
}

export interface IAddTargetGuidanceState extends IState {
    selectedPlatform: string;
    packages: IDictionaryStringTo<IAgentLatestPackage>;
    accessToken: string;
    usePATToken: boolean;
    isDotnetCoreV2Agent: boolean;
    errorMessage?: string;
    showWarning?: boolean;
}

export class AddTargetGuidance extends BaseComponent<IAddTargetGuidanceProps, IAddTargetGuidanceState> {
    constructor(props: IAddTargetGuidanceProps) {
        super(props);

        this._eventManager = Events_Services.getService();
        this._agentPackagesStore = getStore(null, true);
        this._patTokenActionCreator = PATTokenActionCreator.ActionCreator;
        this._patTokenStore = PATTokenStore.Store;

        this.state = this._getState();
    }

    public componentWillMount(): void {
        this._agentPackagesStore.addChangedListener(this._onStoresUpdated);
        this._patTokenStore.addChangedListener(this._onPatTokenFetched);
        this._eventManager.attachEvent(DGUtils.AddTargetGuidanceErrorActions.UpdatePATTokenErrorMessage, this._updateErrorMessage);
    }

    public componentWillUnmount(): void {
        this._agentPackagesStore.removeChangedListener(this._onStoresUpdated);
        this._patTokenStore.removeChangedListener(this._onPatTokenFetched);
        this._eventManager.detachEvent(DGUtils.AddTargetGuidanceErrorActions.UpdatePATTokenErrorMessage, this._updateErrorMessage);
    }

    public componentWillReceiveProps(nextProps: IAddTargetGuidanceProps): void {
        this.setState({showWarning: !!nextProps.warningMessage});
    }

    public render(): JSX.Element {
        let isHosted = DGUtils.isHostedType(); 
        let scriptClass = Utils_String.equals(this.state.selectedPlatform, DGUtils.DeploymentGroupsConstants.Windows) || Utils_String.equals(this.state.selectedPlatform, DGUtils.DeploymentGroupsConstants.Windows_7) ? "script-content powershell" : "script-content";
        let scriptTitle = Utils_String.equals(this.state.selectedPlatform, DGUtils.DeploymentGroupsConstants.Windows) || Utils_String.equals(this.state.selectedPlatform, DGUtils.DeploymentGroupsConstants.Windows_7) ? Resources.RegistrationScriptPowerShell : Resources.RegistrationScript;
        let calloutContent: ICalloutContentProps = {
            calloutDescription: Resources.UsePATWarning,
            calloutLink: DGUtils.MachineGroupsForwardLinks.LearnMoreAboutPAT, 
            calloutLinkText: Resources.LearnMoreInfoAboutPAT
        };
        
        return (
            <div className={css(this.props.cssClass, "add-machine-guidance")} role="region" aria-label={Resources.RegisterMachine} >
                {this._getErrorMessage()}
                {this._getWarningMessage()}
                <div className="add-machine-scripts">
                    <div className="add-machine-scripts-platforms">
                        <Dropdown
                            label={Resources.ChooseMachineType}
                            defaultSelectedKey={this.state.selectedPlatform}
                            options={this._getPlatforms(this.state.isDotnetCoreV2Agent)}
                            onChanged={this._onPlatformSelected} />
                        <Link href={this._getSystemPreReqsLinkUrl(this.state.selectedPlatform)} target="_blank" rel="external noopener noreferrer">
                            <span className="bowtie-icon bowtie-status-help-outline"></span>
                            {Resources.SystemPreRequisitesLinkText}
                            <span className="bowtie-icon bowtie-navigate-external"></span>
                        </Link>
                    </div>
                    <div className="add-machine-scripts-step">
                        {scriptTitle}
                    </div>
                    <div className="add-machine-scripts-script">
                        <div className={scriptClass}>
                            <DynamicMarkDown markdown={this._getFormatedScript()} />
                        </div>
                        {isHosted &&
                            <Checkbox
                                className="add-machine-scripts-pat"
                                label={Resources.PATCheckBoxLabel}
                                defaultChecked={false}
                                onChange={this._onCheckboxChange} >
                                <InfoButton cssClass="add-machine-scripts-pat-warning" calloutContent={calloutContent} />
                            </Checkbox>
                        }
                    </div>
                    <div className="bowtie machine-group-buttons">
                        <CopyButton
                            cssClass={"btn-cta"}
                            copyText={this._getScript(true)}
                            copyAsHtml={true}
                            buttonTitle={Resources.CopyScriptToClipboard}
                            disabled={this._isCopyButtonDisabled()} />
                        <div className="add-machine-scripts-run-script" >
                            <span className="bowtie-icon bowtie-status-info-outline"></span>{this._getRunScriptGuidance()}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    private _getState(): IAddTargetGuidanceState {
        const packages = this._getPackages(true);

        return {
            packages: packages,
            selectedPlatform: DGUtils.DeploymentGroupsConstants.Windows,
            accessToken: Utils_String.empty,
            usePATToken: false,
            isDotnetCoreV2Agent: true,
            showWarning: !!this.props.warningMessage
        };
    }

    private _onStoresUpdated = (): void => {
        this.setState(this._getState());
    }

    private _onPatTokenFetched = (): void => {
        let token = this._patTokenStore.getToken();
        this.setState({
            accessToken: token
        });

        PerformanceTelemetry.PerformanceUtil.endScenario(PerfScenariosConstants.CreateAccessTokenScenario);
    }

    private _onPlatformSelected = (item: IDropdownOption): void => {
        this.setState({
            selectedPlatform: item.key.toString()
        });
    }

    private _onCheckboxChange = (ev: React.FormEvent<HTMLElement>, isChecked: boolean): void => {
        if (isChecked && (!this.state.accessToken || this.state.accessToken.length < 1)) {
            PerformanceTelemetry.PerformanceUtil.startScenario(PerfScenariosConstants.CreateAccessTokenScenario);
            if (this._isDeploymentGroupResource()) {
                this._patTokenActionCreator.createDeploymentGroupPersonalAccessToken(this.props.resourceId);
            }
            else {
                this._patTokenActionCreator.createDeploymentPoolPersonalAccessToken(this.props.resourceId);
            }
        }

        this.setState({
            usePATToken: isChecked
        });
    }

    private _getScript(copyAuthParams: boolean): string {
        let agentDownoloadUrl = this._getAgentDownloadUrl(this.state.selectedPlatform);
        if (!agentDownoloadUrl) {
            return Utils_String.empty;
        }

        let url = DGUtils.UrlHelper.getAccountUri();
        let resourceParams = this._getResourceParams();
        let projectParams = this._getProjectParams();
        let authParameters: string = this._getAuthParams(copyAuthParams);
        let collectionParams: string = this._getCollectionParams();

        if (Utils_String.equals(this.state.selectedPlatform, DGUtils.DeploymentGroupsConstants.Ubuntu14_04)) {
            return Utils_String.format(DGUtils.AgentConfigurationScripts.LinuxInteractive, agentDownoloadUrl, resourceParams, url, collectionParams, projectParams, authParameters);
        }
        else if (Utils_String.equals(this.state.selectedPlatform, DGUtils.DeploymentGroupsConstants.Ubuntu16_04)) {
            return Utils_String.format(DGUtils.AgentConfigurationScripts.LinuxService, agentDownoloadUrl, resourceParams, url, collectionParams, projectParams, authParameters);
        }
        else if (Utils_String.equals(this.state.selectedPlatform, DGUtils.DeploymentGroupsConstants.RedHat7_2)) {
            return Utils_String.format(DGUtils.AgentConfigurationScripts.LinuxService, agentDownoloadUrl, resourceParams, url, collectionParams, projectParams, authParameters);
        }
        else if (Utils_String.equals(this.state.selectedPlatform, DGUtils.DeploymentGroupsConstants.Linux)) {
            return Utils_String.format(DGUtils.AgentConfigurationScripts.Linux, agentDownoloadUrl, resourceParams, url, collectionParams, projectParams, authParameters);
        }
        else {
            let winConfigScript: string = Utils_String.format(DGUtils.AgentConfigurationScripts.Windows, agentDownoloadUrl, resourceParams, url, collectionParams, projectParams, authParameters);
            let agentConfigurationPSAdminPromptCheck: string = Utils_String.format(DGUtils.AgentConfigurationScripts.PSAdminPromptCheck, Resources.RunCommandInAdministratorPowerShellPrompt);
            let agentConfigurationPSMinVersionCheck: string = Utils_String.format(DGUtils.AgentConfigurationScripts.PSMinVersionCheck, Resources.PSMinVersionCheck);
            return agentConfigurationPSAdminPromptCheck.concat(agentConfigurationPSMinVersionCheck).concat(winConfigScript);
        }
    }

    private _getAuthParams(copyAuthParams: boolean): string {
        let authParameters = Utils_String.empty;
        let token: string = this.state.accessToken;
        let isSchemeHttp: boolean = !DGUtils.canUseHttpsProtocol();

        if (isSchemeHttp) {
            if (Utils_String.equals(this.state.selectedPlatform, DGUtils.DeploymentGroupsConstants.Windows) || Utils_String.equals(this.state.selectedPlatform, DGUtils.DeploymentGroupsConstants.Windows_7)) {
                authParameters = DGUtils.AgentConfigurationScripts.AuthParamIntegrated;
            }
            else {
                authParameters = DGUtils.AgentConfigurationScripts.AuthParamNegotiate;
            }
        }
        else if (copyAuthParams && this.state.usePATToken && token && token.length > 0) {
            authParameters = Utils_String.format(DGUtils.AgentConfigurationScripts.AuthParameters, token);
        }

        return authParameters;
    }

    private _getResourceParams(): string {
        let resourceParams = Utils_String.empty;
        if (this._isDeploymentGroupResource()) {
            resourceParams = Utils_String.format(DGUtils.AgentConfigurationScripts.DeploymentGroupParams, this.props.resourceName);
        }
        else {
            resourceParams = Utils_String.format(DGUtils.AgentConfigurationScripts.DeploymentPoolParams, this.props.resourceName);
        }

        return resourceParams;
    }

    private _getProjectParams(): string {
        let projectParams = Utils_String.empty;

        if (this._isDeploymentGroupResource()) {
            let projectName = DGUtils.UrlHelper.getProjectName();
            projectParams = Utils_String.format(DGUtils.AgentConfigurationScripts.ProjectParams, projectName);
        }

        return projectParams;
    }

    private _getCollectionParams(): string {
        let collectionName = Utils_String.empty;
        let isOnPremise: boolean = !DGUtils.isHostedType();

        if (isOnPremise && this._isDeploymentGroupResource()) {
            collectionName = Utils_String.format(DGUtils.AgentConfigurationScripts.CollectionName, DGUtils.getCollectionName());
        }

        return collectionName;
    }

    private _getAgentDownloadUrl(platform: string): string {
        if (!this.state.packages) {
            return undefined;
        }
        if (Utils_String.equals(platform, DGUtils.DeploymentGroupsConstants.Ubuntu14_04)) {
            let ubuntu14_package = this.state.packages[DGUtils.PackageTypes.Ubuntu_14];
            if (ubuntu14_package) {
                return ubuntu14_package.package.downloadUrl;
            }
        }
        else if (Utils_String.equals(platform, DGUtils.DeploymentGroupsConstants.Ubuntu16_04)) {
            let ubuntu16_package = this.state.packages[DGUtils.PackageTypes.Ubuntu_16];
            if (ubuntu16_package) {
                return ubuntu16_package.package.downloadUrl;
            }
        }
        else if (Utils_String.equals(platform, DGUtils.DeploymentGroupsConstants.RedHat7_2)) {
            let redhad7_package = this.state.packages[DGUtils.PackageTypes.RedHat_72];
            if (redhad7_package) {
                return redhad7_package.package.downloadUrl;
            }
        }
        else if (Utils_String.equals(platform, DGUtils.DeploymentGroupsConstants.Windows_7)) {
            let win7_package = this.state.packages[DGUtils.PackageTypes.Windows_7];
            if (win7_package) {
                return win7_package.package.downloadUrl;
            }
        }
        else if (Utils_String.equals(platform, DGUtils.DeploymentGroupsConstants.Windows)) {
            let win_package = this.state.packages[DGUtils.PackageTypes.Windows];
            if (win_package) {
                return win_package.package.downloadUrl;
            }
        }
        else if (Utils_String.equals(platform, DGUtils.DeploymentGroupsConstants.Linux)) {
            let linux_package = this.state.packages[DGUtils.PackageTypes.Linux];
            if (linux_package) {
                return linux_package.package.downloadUrl;
            }
        }

        return undefined;
    }

    private _getFormatedScript(): string {
        let script = this._getScript(false);

        if (Utils_String.equals(this.state.selectedPlatform, DGUtils.DeploymentGroupsConstants.Ubuntu14_04) ||
            Utils_String.equals(this.state.selectedPlatform, DGUtils.DeploymentGroupsConstants.Ubuntu16_04) ||
            Utils_String.equals(this.state.selectedPlatform, DGUtils.DeploymentGroupsConstants.RedHat7_2) ||
            Utils_String.equals(this.state.selectedPlatform, DGUtils.DeploymentGroupsConstants.Linux)) {
            return Utils_String.format(DGUtils.AgentConfigurationScripts.ScriptFormatBash, script);
        }
        else {
            return Utils_String.format(DGUtils.AgentConfigurationScripts.ScriptFormatPowerShell, script);
        }
    }

    private _getRunScriptGuidance(): string {
        if (!this.props.copyScriptEnabled) {
            if(!!this.props.warningMessage) {
                return Resources.GuidanceForInsufficientPermissions; 
            }
            return this._isDeploymentGroupResource() ? Resources.GuidanceForUnsavedDeploymentGroup : Resources.GuidanceForUnsavedDeploymentPool;
        }
        if (Utils_String.equals(this.state.selectedPlatform, DGUtils.DeploymentGroupsConstants.Windows) || Utils_String.equals(this.state.selectedPlatform, DGUtils.DeploymentGroupsConstants.Windows_7)) {
            return Resources.GuidanceForRunPowerShellScript;
        }
        else {
            return Resources.GuidanceForRunShellScript;
        }
    }

    private _getSystemPreReqsLinkUrl(platform: string): string {
        if (Utils_String.equals(platform, DGUtils.DeploymentGroupsConstants.Windows) || Utils_String.equals(platform, DGUtils.DeploymentGroupsConstants.Windows_7)) {
            return "https://aka.ms/vstsagentwinsystem";
        }
        else if (Utils_String.equals(platform, DGUtils.DeploymentGroupsConstants.RedHat7_2)) {
            return "https://aka.ms/vstsagentredhatsystem";
        }
        else if (Utils_String.equals(platform, DGUtils.DeploymentGroupsConstants.Ubuntu14_04) || Utils_String.equals(platform, DGUtils.DeploymentGroupsConstants.Ubuntu16_04)) {
            return "https://aka.ms/vstsagentubuntusystem";
        }
        else {
            return "https://aka.ms/vstsagentlinuxsystem";
        }
    }

    private _isCopyButtonDisabled(): boolean {
        return !this.props.copyScriptEnabled || (this.state.usePATToken && (!this.state.accessToken || this.state.accessToken.length < 1));
    }

    private _getPackages(isDotnetCoreV2Agent: boolean): IDictionaryStringTo<IAgentLatestPackage> {
        let packages: IDictionaryStringTo<IAgentLatestPackage> = {};

        if (isDotnetCoreV2Agent) {
            packages[DGUtils.PackageTypes.Linux] = this._agentPackagesStore.getLatestPackage(DGUtils.PackageTypes.Linux);
            packages[DGUtils.PackageTypes.Osx] = this._agentPackagesStore.getLatestPackage(DGUtils.PackageTypes.Osx);
            packages[DGUtils.PackageTypes.Windows] = this._agentPackagesStore.getLatestPackage(DGUtils.PackageTypes.Windows);
        }
        else {
            packages[DGUtils.PackageTypes.RedHat_72] = this._agentPackagesStore.getLatestPackage(DGUtils.PackageTypes.RedHat_72);
            packages[DGUtils.PackageTypes.Osx_10_11] = this._agentPackagesStore.getLatestPackage(DGUtils.PackageTypes.Osx_10_11);
            packages[DGUtils.PackageTypes.Ubuntu_14] = this._agentPackagesStore.getLatestPackage(DGUtils.PackageTypes.Ubuntu_14);
            packages[DGUtils.PackageTypes.Ubuntu_16] = this._agentPackagesStore.getLatestPackage(DGUtils.PackageTypes.Ubuntu_16);
            packages[DGUtils.PackageTypes.Windows_7] = this._agentPackagesStore.getLatestPackage(DGUtils.PackageTypes.Windows_7);
        }

        return packages;
    }

    private _getPlatforms(isDotnetCoreV2Agent: boolean): IDropdownOption[] {
        let platforms: IDropdownOption[] = [];

        if (isDotnetCoreV2Agent) {
            platforms.push({ key: DGUtils.DeploymentGroupsConstants.Windows, text: Resources.AgentPlatformWindows });
            platforms.push({ key: DGUtils.DeploymentGroupsConstants.Linux, text: Resources.AgentPlatformLinux });
        }
        else {
            platforms.push({ key: DGUtils.DeploymentGroupsConstants.Windows_7, text: Resources.AgentPlatformWindows });
            platforms.push({ key: DGUtils.DeploymentGroupsConstants.Ubuntu14_04, text: Resources.AgentPlatformUbuntu14 });
            platforms.push({ key: DGUtils.DeploymentGroupsConstants.Ubuntu16_04, text: Resources.AgentPlatformUbuntu16 });
            platforms.push({ key: DGUtils.DeploymentGroupsConstants.RedHat7_2, text: Resources.AgentPlatformRedhat7 });
        }

        return platforms;
    }

    private _getErrorMessage(): JSX.Element {
        return !!this.state.errorMessage ?
            <MessageBar
                messageBarType={MessageBarType.error}
                isMultiline={true}
                onDismiss={this._clearErrorMessage}
                dismissButtonAriaLabel = {Resources.CloseButtonText} >
                {this.state.errorMessage}
            </MessageBar> : null;
    }

    private _getWarningMessage(): JSX.Element {
        return this.state.showWarning ?
            <MessageBar
                messageBarType={MessageBarType.warning}
                isMultiline={false}
                onDismiss={this._clearWarningMessage}
                dismissButtonAriaLabel = {Resources.CloseButtonText} >
                {this.props.warningMessage}
            </MessageBar> : null;
    }

    private _updateErrorMessage = (sender: any, error: any): void => {
        this.setState({
            errorMessage: VSS.getErrorMessage(error)
        });
    }

    private _clearErrorMessage = (): void => {
        this.setState({
            errorMessage: Utils_String.empty
        });
    }

    private _clearWarningMessage = (): void => {
        this.setState({
            showWarning: false
        });
    }

    private _isDeploymentGroupResource(): boolean {
        return Utils_String.equals(this.props.resourceType, DGUtils.AddTargetGuidanceResourceTypes.DeploymentGroup);
    }

    private _agentPackagesStore: AgentPackagesStore;
    private _patTokenActionCreator: PATTokenActionCreator.PATTokenActionCreator;
    private _patTokenStore: PATTokenStore.PATTokenStore;
    private _eventManager: Events_Services.EventService;
}

export class DynamicMarkDown extends MarkdownComponent {
    public componentWillReceiveProps(nextProps: IMarkdownComponentProps): void {
        if (!Utils_String.equals(this.props.markdown, nextProps.markdown, false)) {
            this.setState({
                resolvedMarkdown: MarkdownComponent.marked(nextProps.markdown)
            });
        }
    }
}
