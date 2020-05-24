/// <reference types="react" />

import * as React from "react";

import * as ComponentBase from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";

import { Dialog, DialogFooter, DialogType } from "OfficeFabric/Dialog";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { css } from "OfficeFabric/Utilities";
import { IPivotItemProps, Pivot, PivotItem, PivotLinkSize } from "OfficeFabric/Pivot";
import { Label } from "OfficeFabric/Label";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import * as ActionsCreator from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingActionsCreator";
import * as ReportingStore from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingStore";

import { DeploymentTimeTrendChart, IDeploymentTimeTrendChartProps } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/Charts/DeploymentTimeTrendChart";
import { ReleaseReportingKeys } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/Constants";

import { ProgressIndicatorStore } from "PipelineWorkflow/Scripts/Common/Stores/ProgressIndicatorStore";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingDialog";

export interface IReleaseReportingDialogProps extends Base.IProps {
    showDialog: boolean;
    definitionId: number;
    definitionName?: string;
    onCloseDialog?: () => void;
    releaseReportingDialogStore: ReportingStore.ReleaseReportingStore;
    releaseReportingActionsCreator: ActionsCreator.ReleaseReportingActionsCreator;
    instanceId: string;
}

export interface IDefinitionTrendChartProps extends ComponentBase.Props {
    environmentDeployments: IEnvironmentDeployments[];
}

export interface IEnvironmentDeployments {
    environmentId: number;
    environmentName: string;
    deployments: IDeploymentRenderingData[];
}

export interface IDeploymentRenderingData {
    id: number;
    status: number;
    startedOn: Date;
    completedOn: Date;
    totalTimeInSeconds: number;
}

export class ReleaseReportingDialog extends Base.Component<IReleaseReportingDialogProps, ReportingStore.IReleaseReportingState> {

    constructor(props: IReleaseReportingDialogProps) {
        super(props);
        this._initialize();
    }

    public componentWillMount() {
        this._progressStore = StoreManager.GetStore<ProgressIndicatorStore>(ProgressIndicatorStore, this._instanceId);

        this.setState(this._store.getState());

        this._store.addChangedListener(this._handleStoreChange);
        this._progressStore.addChangedListener(this._handleStoreChange);
    }

    public componentWillUnmount() {
        this._progressStore.removeChangedListener(this._handleStoreChange);
        this._store.removeChangedListener(this._handleStoreChange);

        ActionCreatorManager.DeleteActionCreator<ActionsCreator.ReleaseReportingActionsCreator>(ActionsCreator.ReleaseReportingActionsCreator, this._instanceId);

        StoreManager.DeleteStore<ReportingStore.ReleaseReportingStore>(ReportingStore.ReleaseReportingStore, this._instanceId);
        StoreManager.DeleteStore<ProgressIndicatorStore>(ProgressIndicatorStore, this._instanceId);
    }

    public render(): JSX.Element {

        let definitionTrendChartProps: IDefinitionTrendChartProps = {
            environmentDeployments: !!this.state.environmentDeployments ? this.state.environmentDeployments : [],
        };

        return (
            this.state.showDialog ?
                <Dialog
                    dialogContentProps={{
                        type: DialogType.close,
                        subText: this._getDefinitionName()
                    }}
                    modalProps={{
                        className: css("release-reporting-dialog"),
                        containerClassName: css("release-reporting-container"),
                        isBlocking: true
                    }}
                    title={Resources.DefinitionAnalysisHeader}
                    hidden={!this.state.showDialog}
                    onDismiss={() => { this._onCloseDialog(); }}
                    closeButtonAriaLabel={Resources.CloseText} >

                    {
                        !!this.state.errorMessage &&
                        <MessageBar
                            className="release-dialog-message-bar"
                            messageBarType={MessageBarType.error}
                            dismissButtonAriaLabel={Resources.CloseText}>
                            {this.state.errorMessage}
                        </MessageBar>
                    }
                    <div>
                        {this._getSeparator()}
                        {this._getPerformanceClusterSection(definitionTrendChartProps)}
                    </div>
                </Dialog> : null
        );
    }

    private _handleStoreChange = (): void => {
        this.setState(this._store.getState());
    }

    private _onCloseDialog(): void {
        if (this.props.onCloseDialog) {
            this.props.onCloseDialog();
        }
    }

    private _getDefinitionName(): string {
        return !!this.state.definition ? this.state.definition.name : this.props.definitionName || Utils_String.empty;
    }

    private _getSeparator(): JSX.Element {
        return (<div className="release-reporting-dialog empty-separator"></div>);
    }

    private _getDeploymentTimeChartByEnvironment(definitionTrendChartProps: IDefinitionTrendChartProps): JSX.Element[] {
        let environmentsList: JSX.Element[] = [];
        if (!!definitionTrendChartProps && !!definitionTrendChartProps.environmentDeployments) {
            definitionTrendChartProps.environmentDeployments.forEach((environmentDeployment) => {
                environmentsList.push((
                    <div className={`deployment-trend`} key={environmentDeployment.environmentId}>
                        <b>{environmentDeployment.environmentName}</b>
                        {
                            environmentDeployment && environmentDeployment.deployments &&
                            <DeploymentTimeTrendChart key={environmentDeployment.environmentName} {...this._getSelectDeploymentByEnvironmentProps(environmentDeployment)} />
                        }
                    </div>
                ));
            });
        }
        return environmentsList;
    }

    private _getPerformanceClusterSection(definitionTrendChartProps: IDefinitionTrendChartProps): JSX.Element {
        return (
            <div>
                <Pivot linkSize={PivotLinkSize.large}>
                    <PivotItem linkText={Resources.ReportingDeploymentDuration}>
                        {this._getSeparator()}
                        {this._getDeploymentTimeChartByEnvironment(definitionTrendChartProps)}
                    </PivotItem>
                    <PivotItem linkText={Resources.ReportingDeploymentFrequency}>
                        {this._getSeparator()}
                        <Label>Coming soon!!!!!!!</Label>
                    </PivotItem>
                    <PivotItem linkText={Resources.ReportingMTTR}>
                        {this._getSeparator()}
                        <Label>Yet to come!!!!</Label>
                    </PivotItem>
                    <PivotItem linkText={Resources.ReportingTestPassRate}>
                        {this._getSeparator()}
                        <Label>Yet to come!!!!</Label>
                    </PivotItem>
                </Pivot>
            </div>
        );
    }

    private _getSelectDeploymentByEnvironmentProps(environmentDeployments: IEnvironmentDeployments): IDeploymentTimeTrendChartProps {
        let props: IDeploymentTimeTrendChartProps = {
            environmentDeployments: environmentDeployments,
            chartHeight: 500,
            chartWidth: 800,
            suppressAnimation: true
        };

        return props;
    }

    private _initialize(): void {
        this._instanceId = this.props.instanceId;
        this._store = this.props.releaseReportingDialogStore;
        this._actionsCreator = this.props.releaseReportingActionsCreator;
        this._progressStore = StoreManager.GetStore<ProgressIndicatorStore>(ProgressIndicatorStore, this._instanceId);
    }

    private _store: ReportingStore.ReleaseReportingStore;
    private _progressStore: ProgressIndicatorStore;
    private _instanceId: string;
    private _actionsCreator: ActionsCreator.ReleaseReportingActionsCreator;
}