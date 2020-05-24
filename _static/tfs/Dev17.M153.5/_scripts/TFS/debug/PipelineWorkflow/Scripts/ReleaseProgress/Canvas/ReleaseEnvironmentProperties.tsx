import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { OverlayPanelSelectable } from "DistributedTaskControls/Components/OverlayPanelSelectable";
import { TooltipIfOverflow } from "DistributedTaskControls/Components/TooltipIfOverflow";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { LayoutConstants } from "PipelineWorkflow/Scripts/Common/Canvas/LayoutConstants";
import { ReleaseEnvironmentPropertiesItem } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentPropertiesItem";
import {
    INodeDetailsRenderer,
    NodeDetailsRendererFactory,
    ICommonRendererConfig
} from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/NodeDetailsRendererFactory";
import { ReleaseProgressNavigateStateActions } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { CanvasSelectorConstants } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import {
    ActionClickTarget,
    ReleaseEnvironmentStatusIndicator,
    INodeDetailsInfo,
    IReleaseEnvironmentActionInfo,
    IDeploymentIssues,
    IIssuesCount
} from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import { ReleaseEnvironmentActionsStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentActionsStore";
import { ReleaseEnvironmentIssuesHelper } from "PipelineWorkflow/Scripts/Shared/Environment/ReleaseEnvironmentIssuesHelper";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { ComputedDeploymentStatus } from "PipelineWorkflow/Scripts/Common/Types";
import { CanvasDeploymentActionsProvider } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/CanvasDeploymentActionsProvider";
import { ReleaseProgressCanvasTelemetryHelper, CanvasClickTargets } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseProgressCanvasTelemetryHelper";
import { ReleaseEnvironmentPropertiesContributionHost } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentPropertiesContributionHost";
import { IEnvironmentNodeSubStatusTextProps, EnvironmentNodeSubStatusText } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/EnvironmentNodeSubStatusText";
import { ReleaseEnvironmentStatusHelper } from "PipelineWorkflow/Scripts/Shared/Utils/ReleaseEnvironmentStatusHelper";

import { EnvironmentStatus } from "ReleaseManagement/Core/Contracts";

import * as NavigationService from "VSS/Navigation/Services";
import { curry } from "VSS/Utils/Core";
import { BrowserCheckUtils, KeyCode } from "VSS/Utils/UI";
import { HtmlNormalizer } from "VSS/Utils/Html";
import { empty, newLine } from "VSS/Utils/String";
import { VssIcon, VssIconType } from "VSSUI/VssIcon";
import { Status, IStatusProps, StatusSize } from "VSSUI/Status";

import { Link, LinkBase } from "OfficeFabric/Link";
import { css } from "OfficeFabric/Utilities";
import { TooltipHost } from "VSSUI/Tooltip";
import { DirectionalHint } from "OfficeFabric/ContextualMenu";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentProperties";

export interface IReleaseEnvironmentPropertiesState extends Base.IState {
    renderers: INodeDetailsRenderer[];
}

export interface IReleaseEnvironmentPropertiesProps extends Base.IProps {

    name?: string;

    id?: number;

    definitionEnvironmentId?: number;

    statusText?: string;

    statusIndicator?: ReleaseEnvironmentStatusIndicator;

    nodeDetailsInfo?: INodeDetailsInfo[] | IPromise<INodeDetailsInfo[]>;

    disabled?: boolean;

    environmentStatus?: EnvironmentStatus;

    isEditMode?: boolean;

    hasPermission?: boolean;

    computedStatus?: ComputedDeploymentStatus;

    releaseDefinitionFolderPath?: string;

    releaseDefinitionId?: number;

    releaseId?: number;

    hideEnvironmentProperties?: boolean;

    areTasksInvalid?: boolean;

    deploymentIssues?: IDeploymentIssues;

    issuesCount?: IIssuesCount;

    showArtifactConditionsNotMetMessage?: boolean;
}

export class ReleaseEnvironmentProperties extends Base.Component<IReleaseEnvironmentPropertiesProps, IReleaseEnvironmentPropertiesState> {

    public componentWillMount(): void {
        this._resolveRendererConfigIfNeeded(this.props.nodeDetailsInfo);
    }

    public componentWillReceiveProps(nextProps: IReleaseEnvironmentPropertiesProps): void {
        this._resolveRendererConfigIfNeeded(nextProps.nodeDetailsInfo);
    }

    public componentDidMount(): void {
        this._mounted = true;
    }

    public componentWillUnmount(): void {
        this._mounted = false;
    }

    public render(): JSX.Element {
        const style = {
            minHeight: LayoutConstants.releaseCorePropertiesHeight,
            width: LayoutConstants.corePropertiesWidth
        };

        const nameContainerClassName = "name-container";

        let isEnvironmentInProgress: boolean = this.props.environmentStatus === EnvironmentStatus.InProgress;
        let isDisabled = this.props.disabled && isEnvironmentInProgress;

        let additionalStatusList = this._getAdditionalStatusElements();
        const corePropertiesClasses = css("cd-environment-core-properties", "dtc-canvas-element-border", { "cd-node-disabled": isDisabled },
            `deployment-${this.props.statusIndicator.toLowerCase()}`, { "cd-environment-show-additional-status": !!(additionalStatusList.length > 0) });
        const statusContainerClassName = "cd-deployment-status-container";

        const ariaLabelCandidates: string[] = [this.props.name, this.props.statusText];

        const artifactConditionNotMetMessage: string = this.props.showArtifactConditionsNotMetMessage ? Resources.ArtifactConditionsNotMetText : empty;
        const concatenatedResolvedReasons: string = this._getNodeDetailsInfoAriaLabel(this.state.renderers);

        // Either artifactConditionsNotMetMessage or concatenatedResolvedReasons will be present at a time in an environment node
        // artifactConditionsNotMet is possible in case environment status is NotStarted
        // concatenatedResolvedReasons is possible only when environment status is other than NotStarted
        if (artifactConditionNotMetMessage) {
            ariaLabelCandidates.push(artifactConditionNotMetMessage);
        }
        else if (concatenatedResolvedReasons) {
            ariaLabelCandidates.push(concatenatedResolvedReasons);
        }

        if (this.props.isEditMode && !this.props.hasPermission) {
            ariaLabelCandidates.push(Resources.NoPermissionForEditReleaseEnvironment);
        }
        const ariaLabel = ariaLabelCandidates.join(" ");


        let subStatusElements = this._getSubStatusElements();

        let overlayPanelClass: string = css(this.props.cssClass, { "environment-properties-disabled": this.props.isEditMode });
        let fadeOutElementClassName: string = css("name-fade-out-container", { "fade-out-element": !this.props.isEditMode });

        const environmentNameClass = css("cd-environment-name", { "show-ellipsis": BrowserCheckUtils.isFirefox() });

        return (
            <OverlayPanelSelectable
                instanceId={CanvasSelectorConstants.ReleaseCanvasSelectorInstance}
                getItem={this._getItem}
                cssClass={overlayPanelClass}
                ariaLive="polite"
                ariaLabel={ariaLabel}
                disabled={this.props.disabled}
                onShowOverlayPanel={this._publishClickActionTelemetry}>

                <div className={css("cd-environment-core-properties-container", { "environment-properties-panel-disabled": this.props.isEditMode })} key={this.props.name} >

                    <div className={corePropertiesClasses} style={style} >
                        <div className="content">

                            <TooltipIfOverflow tooltip={this.props.name} targetElementClassName="cd-environment-name" >
                                <div className={nameContainerClassName} >
                                    <h3 className={environmentNameClass} ref={this._resolveRef("_environmentNameContainer")}>{this.props.name}</h3>
                                    {this._isEnvironmentNameOverflow() && <span className={fadeOutElementClassName}></span>}
                                </div>
                            </TooltipIfOverflow>
                            {this.props.disabled && isEnvironmentInProgress ? this._getInProgressStatusElement() :
                                <div className={statusContainerClassName} >
                                    {this.props.isEditMode && this.props.hasPermission ? this._getEnvironmentStatusElementForEditState(isDisabled) : this._getEnvironmentStatusElementForNonEditState()}
                                </div>
                            }
                            {
                                additionalStatusList
                            }
                            {
                                !this.props.isEditMode && this._getArtifactConditionsNotMetElement()
                            }
                            {
                                !this.props.isEditMode && this._getIssuesElement()
                            }
                            {
                                subStatusElements
                            }

                        </div>

                        {!this.props.isEditMode && this._getContributionsComponentOnNode()}

                    </div>
                </div>

            </OverlayPanelSelectable>
        );
    }

    private _publishClickActionTelemetry = (): void => {
        ReleaseProgressCanvasTelemetryHelper.publishClickActionTelemetry(CanvasClickTargets.environmentNode);
    }

    private _getInProgressStatusElement(): JSX.Element {
        let statusTextClassName = "cd-deployment-status-text";
        return (
            <TooltipIfOverflow tooltip={Resources.EnvironmentInProgressMessage} targetElementClassName={statusTextClassName} cssClass="cd-deployment-status-tooltip-container" >
                <div
                    className={statusTextClassName}>
                    {Resources.EnvironmentInProgressMessage}
                </div>
            </TooltipIfOverflow>);

    }

    private _getEnvironmentStatusElementForNonEditState(): JSX.Element {

        const statusProps = ReleaseEnvironmentStatusHelper.getStatusIconProps(this.props.statusIndicator);
        const statusTextClassName = "cd-deployment-status-text";

        return this._getEnvironmentStatusElement("", this.props.statusText, statusTextClassName, ReleaseProgressNavigateStateActions.ReleaseEnvironmentLogs, "", false, statusProps);
    }

    private _getEnvironmentStatusElementForEditState(isDisabled?: boolean): JSX.Element {
        let icon: string = this.props.areTasksInvalid ? "bowtie-status-error-outline" : "bowtie-edit-outline";
        const statusIconClasses = css("cd-deployment-edit-icon", "bowtie-icon", icon);
        const statusTextClassName = "cd-deployment-edit-text";

        return this._getEnvironmentStatusElement(statusIconClasses, Resources.EditTasksText, statusTextClassName, ReleaseProgressNavigateStateActions.ReleaseTaskEditor, Resources.EditTasksText, isDisabled);
    }

    private _getEnvironmentStatusElement(statusIconClasses: string, statusText: string, statusTextClassName: string, navigationAction: string, tooltipText?: string, isDisabled?: boolean, statusProps?: IStatusProps): JSX.Element {

        let tooltipContent: string = tooltipText || this._getTooltipForEnvironmentStatusElement();
        return (
            <TooltipHost content={tooltipContent} hostClassName="cd-deployment-status-tooltip-container" directionalHint={DirectionalHint.bottomCenter}>
                <Link
                    onClick={curry(this._onClickHandlerForDeploymentStatusLink, navigationAction)}
                    onKeyDown={curry(this._handleKeyDownOnEnvironmentName, navigationAction)}
                    disabled={isDisabled}
                    className={statusTextClassName}>
                        {
                            statusProps && 
                            <Status {...statusProps} size={StatusSize.s} className="cd-environment-status-icon"/>
                        }
                        {
                            !statusProps &&
                            <span className={statusIconClasses}></span>
                        }
                        <span className="cd-deployment-status-or-edit-text-element">{statusText}</span>
                </Link>
            </TooltipHost>
        );
    }

    private _getTooltipForEnvironmentStatusElement(): string {
        let tooltip = null;
        let action = this._getPrimaryAction();
        if (action) {
            if (action.actionTooltip) {
                tooltip = action.actionTooltip;
            }
        }
        else {
            tooltip = Resources.ViewLogsTooltip;
        }

        return tooltip;
    }

    /**
     * Handler to take care of clicks on the deployment status link
     */
    private _onClickHandlerForDeploymentStatusLink = (navigationAction: string, e: React.SyntheticEvent<HTMLElement | LinkBase>) => {
        ReleaseProgressCanvasTelemetryHelper.publishClickActionTelemetry(CanvasClickTargets.environmentStatusLink, this.props.computedStatus);
        let action = this._getPrimaryAction();

        if (action && action.onExecute) {
            action.onExecute(this.props.instanceId, ActionClickTarget.environmentNodeUrl, this.props.name);
        }
        else {
            this._navigateToEnvironmentsView(navigationAction, e);
        }
    }

    private _getPrimaryAction(): IReleaseEnvironmentActionInfo {
        const environmentActionsStore = StoreManager.GetStore(ReleaseEnvironmentActionsStore, this.props.id.toString());
        const action = environmentActionsStore.getPrimaryAction();

        if (action) {
            const actionHandlerProvider = new CanvasDeploymentActionsProvider();
            action.onExecute = actionHandlerProvider.getActionHandler(action);
        }

        return action;
    }

    private _getSubStatusElements(): JSX.Element[] {
        let renderersContent: JSX.Element[] = [];

        if (this.state && this.state.renderers) {
            this.state.renderers.forEach((renderer: INodeDetailsRenderer, index: number) => {
                renderersContent.push(renderer.getSubStatusElement(null, index));
            });
        }

        return renderersContent;
    }

    private _getAdditionalStatusElements(): JSX.Element[] {
        let additionalStatusElements: JSX.Element[] = [];

        if (this.state && this.state.renderers) {
            this.state.renderers.forEach((renderer: INodeDetailsRenderer, index: number) => {
                let additionalStatusElement = renderer.getAdditionalStatusElement(index);
                if (additionalStatusElement) {
                    additionalStatusElements.push(additionalStatusElement);
                }
            });
        }

        return additionalStatusElements;
    }

    private _getIssuesElement(): JSX.Element {
        if ((this.props.issuesCount) && (this.props.issuesCount.errorsCount + this.props.issuesCount.warningsCount > 0)) {
            const showError = !!this.props.issuesCount.errorsCount;
            const showWarning = !!this.props.issuesCount.warningsCount;
            const issuesInfo = ReleaseEnvironmentIssuesHelper.getIssuesInfo(this.props.issuesCount);
            const issuesElement = (<span>
                { showError && 
                    (<span className="deployment-issues-errors">
                        {issuesInfo.errorsText}
                    </span>)
                }
                {
                    !showError && showWarning &&
                    (<span className="deployment-issues-warnings">
                        {issuesInfo.warningsText}
                    </span>)
                }
            </span>);

            let subStatusProps: IEnvironmentNodeSubStatusTextProps = {
                text: issuesElement,
                className: "cd-environment-issues-text"
            };
            return (
                <div className="cd-environment-issues">
                    <EnvironmentNodeSubStatusText {...subStatusProps} />
                    <span className="fade-out-element"></span>
                </div>
            );
        }

        return null;
    }

    private _getArtifactConditionsNotMetElement(): JSX.Element {
        let artifactConditionsNotMetTextClassName: string = "artifact-conditions-not-met-text";

        return (this.props.showArtifactConditionsNotMetMessage &&
            <TooltipIfOverflow tooltip={Resources.ArtifactConditionsNotMetText} targetElementClassName={artifactConditionsNotMetTextClassName} >
                <div className={"artifact-conditions-not-met-element-container"}>
                    <VssIcon className={"artifact-conditions-not-met-warning-icon"} iconName={"bowtie-status-warning-outline"} iconType={VssIconType.bowtie} />
                    <span className={artifactConditionsNotMetTextClassName}>
                        {Resources.ArtifactConditionsNotMetText}
                    </span>
                </div>
            </TooltipIfOverflow>

        );
    }

    /**
     * This contribution is specifically added for only for the test team.
     * If you wish to add another extension here to this contribution, you might need to check contracts
     * for this contribution point
     */
    private _getContributionsComponentOnNode(): JSX.Element {
        return (<ReleaseEnvironmentPropertiesContributionHost
            releaseId={this.props.releaseId}
            releaseEnvironmentId={this.props.id}
            environmentStatus={this.props.environmentStatus}
            instanceId={this.props.instanceId} />);
    }

    private _getNodeDetailsInfoAriaLabel(renderers: INodeDetailsRenderer[]): string {
        if (renderers) {
            let rendererConfigAriaLabels: string[] = [];
            renderers.forEach((renderer: INodeDetailsRenderer) => {
                if (renderer) {
                    rendererConfigAriaLabels.push(renderer.getAriaLabel());
                }
            });

            const concatenated = rendererConfigAriaLabels.join(" ");
            let plainText = HtmlNormalizer.convertToPlainText(concatenated);
            return plainText.replace(newLine, empty);
        }
        else {
            return empty;
        }
    }

    private _navigateToEnvironmentsView = (navigationAction: string, e: React.SyntheticEvent<HTMLElement | LinkBase>): void => {
            const environmentId = this.props.id;

        NavigationService.getHistoryService().addHistoryPoint(navigationAction, { environmentId: environmentId }, null, false, true);
        e.stopPropagation();
        e.preventDefault();
    }

    private _handleKeyDownOnEnvironmentName = (navigationAction: string, e: React.KeyboardEvent<HTMLElement>) => {
        if (!this.props.disabled && (e.keyCode === KeyCode.ENTER || e.keyCode === KeyCode.SPACE)) {
            this._onClickHandlerForDeploymentStatusLink(navigationAction, e);
        }
    }

    private _resolveRendererConfigIfNeeded(nodeDetailsInfo: INodeDetailsInfo[] | IPromise<INodeDetailsInfo[]>): void {
        let isEnvironmentInProgress: boolean = this.props.environmentStatus === EnvironmentStatus.InProgress;

        if (nodeDetailsInfo) {
            let commonRendererConfig: ICommonRendererConfig = {
                environmentName: this.props.name,
                environmentId: this.props.id,
                hideEnvironmentProperties: this.props.hideEnvironmentProperties,
                instanceId: this.props.instanceId,
                deploymentIssues: this.props.deploymentIssues
            };

            if ((nodeDetailsInfo as INodeDetailsInfo[]).length > 0) {
                this.setState({
                    renderers: NodeDetailsRendererFactory.getRendererInstances(nodeDetailsInfo as INodeDetailsInfo[],
                        commonRendererConfig)
                });
            }
            else {
                const nodeDetailsInfoPromise = nodeDetailsInfo as IPromise<INodeDetailsInfo[]>;
                if (nodeDetailsInfoPromise) {
                    nodeDetailsInfoPromise.then((nodeDetailsInfo) => {
                        if (this._mounted) {
                            this.setState({
                                renderers: NodeDetailsRendererFactory.getRendererInstances(nodeDetailsInfo, commonRendererConfig)
                            });
                        }
                    });
                }
            }
        }
    }

    private _getItem = (): ReleaseEnvironmentPropertiesItem => {
        if (!this.props.isEditMode) {
            return new ReleaseEnvironmentPropertiesItem(
                this.props.instanceId,
                this.props.id,
                this.props.definitionEnvironmentId,
                this.props.name);
        }
    }

    private _isEnvironmentNameOverflow(): boolean {
        if (this._environmentNameContainer &&
            this._environmentNameContainer.offsetWidth < this._environmentNameContainer.scrollWidth) {
            return true;
        }
        return false;
    }

    private _mounted: boolean;
    private _environmentNameContainer: HTMLHeadingElement;
}