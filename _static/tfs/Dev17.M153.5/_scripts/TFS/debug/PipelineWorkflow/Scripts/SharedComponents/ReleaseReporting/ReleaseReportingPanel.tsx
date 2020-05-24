/// <reference types="react" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import { DocumentCard, DocumentCardTitle, DocumentCardType } from "OfficeFabric/DocumentCard";
import { autobind } from "OfficeFabric/Utilities";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { PanelComponent } from "DistributedTaskControls/Components/PanelComponent";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { OverlayPanelHeading } from "DistributedTaskControls/Components/OverlayPanelHeading";

import * as RMUtilsCore from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import {ReleaseReportingPanelStore, IReleaseReportingPanelState } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingPanelStore";
import { ReleaseReportingPanelActionsCreator } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingPanelActionsCreator";
import * as ReportingPanelHelper from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingPanelHelper";
import { ContributionComponent } from "DistributedTaskControls/Components/ContributionComponent";
import { IContributionHostBehavior } from "VSS/Contributions/Controls";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingPanel";

export interface IReleaseReportingPanelProps extends ComponentBase.IProps {
    definitionId: number;
    definitionName?: string;
    hasCloseButton?: boolean;
    onClose?: () => void;
    elementToFocusOnDismiss?: HTMLElement;
    instanceId: string;
}

export class ReleaseReportingPanel extends Base.Component<IReleaseReportingPanelProps, IReleaseReportingPanelState> {

    constructor(props: IReleaseReportingPanelProps) {
        super(props);
    }

    public componentWillMount() {
        let reportingPanelHelper = new ReportingPanelHelper.ReleaseReportingPanelHelper();
        reportingPanelHelper.InitializeReportingPanelStore(670, this.props.instanceId);
        this._store = reportingPanelHelper.getReportingPanelStore();
        this._handleStoreChange();
        this._store.addChangedListener(this._handleStoreChange);
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this._handleStoreChange);
        ActionCreatorManager.DeleteActionCreator<ReleaseReportingPanelActionsCreator>(ReleaseReportingPanelActionsCreator, this.props.instanceId);
    }

    public render(): JSX.Element {
        let contributions = this.state.contributions || [];
        return (
            <PanelComponent
                showPanel={this.state.showPanel}
                panelWidth={this.state.width}
                onClose={this._closePanel}
                onClosed={this._handleOnClosed}
                isBlocking={true}
                hasCloseButton={this.props.hasCloseButton}
                cssClass={"release-reporting-panel"}
                elementToFocusOnDismiss={this.props.elementToFocusOnDismiss}>
                {this._getHeaderSection()}
                <div className="cd-release-report-contributions-section">
            {
                contributions.map((contribution: Contribution) => {
                    return !!contribution.properties.name ? (
                                <div key={contribution.id} className="cd-release-report-card-contribution">
                                    {this._getAnalysisCardItem(contribution)}
                                </div>
                            ) : null;
                        })
                    }
                </div> 
            </PanelComponent>);
    }

    private _getContributionHostBehavior(): IContributionHostBehavior {
        return {
            showLoadingIndicator: true,
            showErrorIndicator: true,
            slowWarningDurationMs: 0
        };
    }

    private _getHeaderSection(): JSX.Element {
       return (
        <div className="release-report-card-panel-section">
            <div>
                <OverlayPanelHeading label={Resources.DefinitionAnalysisHeader}
                    infoButtonRequired={false}>
                </OverlayPanelHeading>
            </div>
            <div>
               {Resources.ReleaseReportingPanelMessage}
            </div>
        </div>
       );
    }

    @autobind
    private _onReleaseDeploymentDurationClick(action: string): void {
        let definitionId: number = this.props.definitionId; 
        RMUtilsCore.ReleaseReportViewHelper.navigateToReleaseReportView(action, definitionId);
    }

    private _getAnalysisCardItem(contribution: Contribution): JSX.Element {
        return (
          <div>
            <br/>
             {<DocumentCard className="release-DocumentCard-details" onClick={() => this._onReleaseDeploymentDurationClick(contribution.properties.reportcontributionid)}>
                <ContributionComponent
                    cssClass="release-reporting-catalog-item"
                    contribution={contribution}
                    initialOptions={null}
                    instanceId={contribution.id}
                    contributionHostBehavior={this._getContributionHostBehavior()} />
             </DocumentCard>}
          </div>
        );
    }

    private _closePanel = () => {
        if (this.state && this.state.showPanel) {
            this.setState({ showPanel: false });
        }
    }

    private _handleOnClosed = () => {
        if (this.props.onClose) {
            this.props.onClose();
        }
    }

    private _handleStoreChange = (): void => {
        this.setState(this._store.getState());
    }

    private _store: ReleaseReportingPanelStore;    
}