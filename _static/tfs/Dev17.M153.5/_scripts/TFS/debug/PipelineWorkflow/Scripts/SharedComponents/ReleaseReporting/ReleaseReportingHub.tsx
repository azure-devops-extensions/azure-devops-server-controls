/// <reference types="react" />

import * as React from "react";

import { autobind } from "OfficeFabric/Utilities";
import { Hub, ScrollableRegion } from "VSSUI/Hub";
import { ObservableValue } from "VSS/Core/Observable";
import { PivotBarItem } from "VSSUI/PivotBar";
import { HubHeader, IHubHeaderProps } from "VSSUI/HubHeader";
import { IHubViewState, HubViewState, IHubViewStateOptions } from "VSSUI/Utilities/HubViewState";
import * as ComponentBase from "VSS/Flux/Component";
import * as NavigationService from "VSS/Navigation/Services";
import * as Utils_String from "VSS/Utils/String";
import { HubsService } from "VSS/Navigation/HubsService";
import { IContributionHostBehavior } from "VSS/Contributions/Controls";
import { IHeaderItemPicker, IHubBreadcrumbItem } from "VSSUI/Components/HubHeader/HubBreadcrumb.Props";

import { LoadingComponent } from "DistributedTaskControls/Components/LoadingComponent";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ContributionComponent } from "DistributedTaskControls/Components/ContributionComponent";

import { DefinitionsUtils } from "PipelineWorkflow/Scripts/Definitions/Utils/DefinitionsUtils";
import * as ActionsCreator from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingActionsCreator";
import * as ReportingStore from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingStore";
import { ProgressIndicatorStore } from "PipelineWorkflow/Scripts/Common/Stores/ProgressIndicatorStore";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { NavigationConstants } from "PipelineWorkflow/Scripts/Common/Constants";

import * as ReleaseExtensionContracts from "ReleaseManagement/Core/ExtensionContracts";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingHub";

export interface IReleaseReportingHubProps extends Base.IProps {
    releaseReportingDialogStore: ReportingStore.ReleaseReportingStore;
    releaseReportingActionsCreator: ActionsCreator.ReleaseReportingActionsCreator;
    instanceId: string;
    defaultPivot?: string;
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

export interface IReleaseReportHeroMatrix {
    name: string;
    key: string;
}

export class ReleaseReportingHub extends Base.Component<IReleaseReportingHubProps, ReportingStore.IReleaseReportingState>  {

    constructor(props) {
        super(props);
        this._initialize();

        this._hubViewState = new HubViewState();
        this._hubViewState.selectedPivot.subscribe(this._handleStoreChange);
    }

    public render(): JSX.Element {
        return (
            <Hub hubViewState={this._hubViewState} scrollableRegion={ScrollableRegion.Hub}>
                {this._getHubHeader()}
                {this._getHubBody()}
            </Hub>
        );
    }

    public componentWillMount() {
        this._progressStore = StoreManager.GetStore<ProgressIndicatorStore>(ProgressIndicatorStore, this._instanceId);
        this._handleStoreChange();
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

    private _getHubHeader(): JSX.Element {
        let definitionName = !!this.state.definition && !!this.state.definition.name ? this.state.definition.name : Utils_String.empty;
        let definitionId = !!this.state.definition && !!this.state.definition.id ? this.state.definition.id : Utils_String.empty;
        let hubHeaderProps: IHubHeaderProps = undefined;

        if (!!definitionName) {
            let breadCrumbItems: IHubBreadcrumbItem[] = [
                {
                text: Resources.AllReleaseDefinitions,
                key: Resources.AllReleaseDefinitions,
                onClick: () => { DefinitionsUtils.navigateToReleasesExplorerView(); }
                },
                {
                text: definitionName,
                key: "ReleaseDefinition" + definitionId,
                onClick: () => { DefinitionsUtils.navigateToReleaseDefinitionView(definitionId.toString()); } 
                }];
            
            hubHeaderProps = this.getHubHeaderProperties(breadCrumbItems, this._getHeaderItemPicker());            
        }

        return <HubHeader {...hubHeaderProps} />;
    }
    
    private _getHubBody(): JSX.Element {
        let contributions = this.state.contributions || [];
        let contribution = contributions.filter(c => Utils_String.ignoreCaseComparer(c.id, this.state.action) === 0)[0];
        if (!contribution){
            return;
        }
        // This looks ugly, but exists for supporting legacy contract.
        let options: ReleaseExtensionContracts.IReleaseViewExtensionConfig = {
            onReleaseChanged: (releaseCallBack) => {
                releaseCallBack(undefined);
            },
            // This is required only for details view, adding here to avoid null ref
            onViewDisplayed: (onDisplayedCallBack) => {
            },
            // TODO: implement selectTab
            selectTab: (tabId: string) => {
            }
        } as ReleaseExtensionContracts.IReleaseViewExtensionConfig;
        return (
               <PivotBarItem 
                   name="release-report-hub-pivot"
                   itemKey="release-report-hub-pivot" >
                       <ContributionComponent
                                   cssClass="release-report-hub-contribution-component absolute-fill"
                                   contribution={contribution}
                                   initialOptions={options}
                                   instanceId={contribution.id}
                                   contributionHostBehavior={this._getContributionHostBehavior()} />
                </PivotBarItem>);
    }

    private _getContributionHostBehavior(): IContributionHostBehavior {
        return {
            showLoadingIndicator: true,
            showErrorIndicator: true,
            slowWarningDurationMs: 0
        };
    }

    private _getHeaderItemPicker(): IHeaderItemPicker {
        return {
            isDropdownVisible: new ObservableValue<boolean>(true),
            selectedItem: this._getSelectedItem(),
            getItems: this._getItems,
            getListItem: (item: IReleaseReportHeroMatrix) =>  ({name: item.name, key: item.key}),
            onSelectedItemChanged: this._onSelectedItemChanged,
            noItemsText: <LoadingComponent label={Resources.Loading} />
        };
    }

    @autobind
    private _onSelectedItemChanged(selectedItem: IReleaseReportHeroMatrix): void{
        NavigationService.getHistoryService().addHistoryPoint(
            selectedItem.key,
            {
                definitionId: this.state.definition.id
            },
            null,
            true,
            false);
    
        this.setState({
            action: selectedItem.key
        });
    }
    
    private _getSelectedItem(): IReleaseReportHeroMatrix {
        let heroMatrixIndicators = this._getItems();
        let selectedActionKey = this.state.action;
        let selectedActionValue = this._getSelectedActionValue(heroMatrixIndicators, selectedActionKey);
        return { name: !!selectedActionValue ? selectedActionValue.name : Resources.ReleaseReportingDeploymentDuration, key: selectedActionKey };
    }

    private _getSelectedActionValue(heroMatrixIndicators: IReleaseReportHeroMatrix[], key: string): IReleaseReportHeroMatrix {
        return heroMatrixIndicators.filter(item => Utils_String.equals(item.key, key, true))[0];
    }

    private _getSeparator(): JSX.Element {
        return (<div className="release-report-empty-separator"></div>);
    }

    private _getItems = (): IReleaseReportHeroMatrix[]  => {
        let items: IReleaseReportHeroMatrix[] = [];
        if (this.state.contributions) {
            this.state.contributions.forEach((contribution: Contribution) => {
                items.push({
                    name: contribution.properties.name,
                    key: contribution.id
                });
            });
        }

        return items;
    }

    private  getHubHeaderProperties(breadcrumbItems: IHubBreadcrumbItem[], items: IHeaderItemPicker): IHubHeaderProps {
        const headerHubProps: IHubHeaderProps = {
            headerItemPicker: items,
            breadcrumbItems: breadcrumbItems
        };

        return headerHubProps;
    }

    private _handleStoreChange = (): void => {
        this.setState(this._store.getState());
        this.setState({
            action: this._getActionFromUrl()
        });
    }

    private _getActionFromUrl(): string {
        let state: any = NavigationService.getHistoryService().getCurrentState();
        if (!!state) {
            return state.action;
        }

        return Utils_String.empty;
    }

    private _initialize(): void {
        this._instanceId = this.props.instanceId;
        this._store = this.props.releaseReportingDialogStore;
        this._actionsCreator = this.props.releaseReportingActionsCreator;
        this._progressStore = StoreManager.GetStore<ProgressIndicatorStore>(ProgressIndicatorStore, this._instanceId);
    }

    private _store: ReportingStore.ReleaseReportingStore;
    private _progressStore: ProgressIndicatorStore;
    private _actionsCreator: ActionsCreator.ReleaseReportingActionsCreator;
    private _hubViewState: IHubViewState;
    private _instanceId: string;
}