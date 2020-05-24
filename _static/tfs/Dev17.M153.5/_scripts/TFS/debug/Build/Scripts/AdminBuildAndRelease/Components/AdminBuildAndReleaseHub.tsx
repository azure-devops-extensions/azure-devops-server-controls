/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");

import Component_Base = require("VSS/Flux/Component");
import Navigation_Services = require("VSS/Navigation/Services");
import Utils_String = require("VSS/Utils/String");
import TfsWebContext = require('VSS/Context');
import Utils_Core = require("VSS/Utils/Core");

import { Fabric } from "OfficeFabric/Fabric";

import { IHubViewState, HubViewState } from "VSSUI/Utilities/HubViewState";
import { Hub, IHub } from "VSSUI/Hub";
import { IHubBreadcrumbItem, HubHeader } from "VSSUI/HubHeader";
import { PickListFilterBarItem } from "VSSUI/PickList";
import { PivotBarItem, IPivotBarAction } from 'VSSUI/PivotBar';

import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import { AdminSettingsView } from "Build/Scripts/AdminBuildAndRelease/Components/AdminSettingsView";
import { AdminResourceLimitsView } from "Build/Scripts/AdminBuildAndRelease/Components/AdminResourceLimitsView";
import { AdminConcurrentJobsView } from "Build/Scripts/AdminBuildAndRelease/Components/AdminConcurrentJobsView";
import { AdminBuildQueueComponentProps } from "Build/Scripts/Components/AdminBuildQueue";
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import * as Service from "VSS/Service";
import * as Contribution_Services from "VSS/Contributions/Services";

export interface AdminBuildAndReleaseHubState extends Component_Base.State {
    view: string;
    tab: string;
}

export class AdminBuildAndReleaseHub extends Component_Base.Component<Component_Base.Props, AdminBuildAndReleaseHubState> {

    private _hubViewState: IHubViewState;
    private _hub: IHub;
    private _settingsKey: string = 'settings';
    private _resourceLimitsKey: string = 'resourceLimits';
    private _concurrentJobsKey: string = 'concurrentJobs';
    private _showConcurrentJobsTab: boolean;

    constructor(props: Component_Base.Props) {
        super(props);
        let state = this._getState();
        this._hubViewState = new HubViewState({
            defaultPivot: state.tab
        });
        this._urlStateChangeDelegate = Utils_Core.delegate(this, this._onUrlChange);
        this._showConcurrentJobsTab = TFS_Host_TfsContext.TfsContext.getDefault().isHosted;
    }

    public componentDidMount(): void {
        super.componentDidMount();
        this._hubViewState.selectedPivot.subscribe(this._onPivotChanged);
        Navigation_Services.getHistoryService().attachNavigate(this._urlStateChangeDelegate);
    }

    public componentWillUnmount(): void {
        Navigation_Services.getHistoryService().detachNavigate(this._urlStateChangeDelegate);
        this._hubViewState.selectedPivot.unsubscribe(this._onPivotChanged);
        super.componentWillUnmount();
    }

    public render(): JSX.Element {
        let hubContent = this._getHubContent();
        return (
            <Fabric>
                <Hub
                    componentRef={(hub => { this._hub = hub; })}
                    hubViewState={this._hubViewState}
                    hideFullScreenToggle={true}>
                    <HubHeader />
                    {hubContent}
                </Hub>
            </Fabric>
        );
    }

    private _onPivotChanged = (ev: any, pivotKey: string) => {
        let urlState = Navigation_Services.getHistoryService().getCurrentState();
        if (!Utils_String.equals(ev, urlState.action, true)) {
            urlState.action = ev;
            Navigation_Services.getHistoryService().addHistoryPoint(undefined, urlState, undefined, false, false);
        }
    }

    private _onUrlChange(): void {
        let state = this._getState();
        this._hubViewState.selectedPivot.value = state.tab;
    }

    private _getHubContent(): JSX.Element[] {
        let pivotItems = [];

        pivotItems.push(
            <PivotBarItem name={BuildResources.BuildSettingsTabTitle} itemKey={this._settingsKey} key={this._settingsKey}>
                <Fabric> <AdminSettingsView /> </Fabric>
            </PivotBarItem>
        );

        if (this._showConcurrentJobsTab) {
            const pageDataService = Service.getService(Contribution_Services.WebPageDataService);
            const pageData = pageDataService.getPageData<AdminBuildQueueComponentProps>("ms.vss-build-web.build-queue-hub-data-provider");

            if (pageData.includeConcurrentJobsSection) {
                pivotItems.push(
                    <PivotBarItem name={BuildResources.ConcurrentJobsText} itemKey={this._concurrentJobsKey} key={this._concurrentJobsKey}>
                        <Fabric> <AdminConcurrentJobsView resourceUsages={pageData.resourceUsages} taskHubLicenseDetails={pageData.taskHubLicenseDetails} selfHostedLicensePurchaseLink={pageData.selfHostedLicensePurchaseLink} microsoftHostedLicensePurchaseLink={pageData.microsoftHostedLicensePurchaseLink}/> </Fabric>
                    </PivotBarItem >
                );
            }
            else if (pageData.includeResourceLimitsSection) {
                pivotItems.push(
                    <PivotBarItem name={BuildResources.BuildAndReleaseResourceLimitsTabTitle} itemKey={this._resourceLimitsKey} key={this._resourceLimitsKey}>
                        <Fabric> <AdminResourceLimitsView /> </Fabric>
                    </PivotBarItem>
                );
            }
        }

        return (pivotItems);
    }

    private _getState(): AdminBuildAndReleaseHubState {
        if (this.state) {
            return this.state;
        }

        let urlState = Navigation_Services.getHistoryService().getCurrentState();
        return {
            view: urlState.view || this._settingsKey,
            tab: urlState.action || this._settingsKey
        };
    }

    private _urlStateChangeDelegate: IFunctionPPR<any, any, void>;
}

export function load(element: HTMLElement): void {
    ReactDOM.render(<AdminBuildAndReleaseHub />, element);
}