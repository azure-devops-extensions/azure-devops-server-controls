// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />
/// <reference types="react-dom" />

import React = require('react');
import ReactDOM = require('react-dom');
import Context = require('VSS/Context');
import Component_Base = require('VSS/Flux/Component');
import Navigation_Controls = require('VSS/Controls/Navigation');
import Navigation_Services = require('VSS/Navigation/Services');
import VSS_Resources_Platform = require('VSS/Resources/VSS.Resources.Platform');
import Utils_String = require('VSS/Utils/String');
import Utils_Core = require('VSS/Utils/Core');
import VSS = require('VSS/VSS');
import { Fabric } from "OfficeFabric/Fabric";
import DPUtils = require('ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Utils');
import Resources = require('ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline');
import { DeploymentPools } from "ReleasePipeline/Scripts/DeploymentPools/Components/DeploymentPools";
import { DeploymentPool } from 'ReleasePipeline/Scripts/DeploymentPools/Components/DeploymentPool';
import { DeploymentTarget } from 'ReleasePipeline/Scripts/DeploymentPools/Components/DeploymentTarget';
import PerformanceTelemetry = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.PerformanceTelemetry");
import {PerfScenariosConstants} from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";

export interface DeploymentPoolsHubProps extends Component_Base.Props {

}

export interface DeploymentPoolsHubState extends Component_Base.State {
    view: string;
    poolId: number;
    tab: string;
    targetId?: number;
}

export class DeploymentPoolsHub extends Component_Base.Component<DeploymentPoolsHubProps, DeploymentPoolsHubState> {
    constructor(props: DeploymentPoolsHubProps) {
        super(props);
        this._urlStateChangeDelegate = Utils_Core.delegate(this, this.onUrlChange);
    }

    public render(): JSX.Element {
        let state = this._getState();

        if(this._isDeploymentTargetView(state.view, state.poolId, state.targetId)) {
            this._setWindowTitle(Resources.DeploymentTargetPageTitle);
            PerformanceTelemetry.PerformanceUtil.startScenario(PerfScenariosConstants.LoadTargetScenario);
            return (<div>
                <div className="hub-progress pageProgressIndicator" />
                    <DeploymentTarget poolId = {state.poolId} targetId = {state.targetId} />
            </div>);
        }

        if (this._isDeploymemtPoolView(state.view, state.poolId)) {
            this._setWindowTitle(Resources.DeploymentPoolPageTitle);
            return (<div>
                <div className="hub-progress pageProgressIndicator" />
                    <DeploymentPool poolId={state.poolId} tab={state.tab}/>
            </div>);
        }
        else {
            PerformanceTelemetry.PerformanceUtil.startPageInteractiveScenarioFromNavigation(PerfScenariosConstants.LandingOnDeploymentPoolHubScenario);
            this._setWindowTitle(Resources.DeploymentPoolsPageTitle);
            return (<div>
                <div className="hub-progress pageProgressIndicator" />
                    <DeploymentPools />
            </div>);
        }
    }

    public componentDidMount() {
        super.componentDidMount();
        // Attach to URL changes
        Navigation_Services.getHistoryService().attachNavigate(this._urlStateChangeDelegate);
    }

    public componentWillUnmount() {
        super.componentWillUnmount();
        Navigation_Services.getHistoryService().detachNavigate(this._urlStateChangeDelegate);
    }

    protected _getState(): DeploymentPoolsHubState {
        if (this.state) {
            return this.state;
        }

        let urlState = Navigation_Services.getHistoryService().getCurrentState();
        return {
            view: urlState.view || DPUtils.DeploymentPoolsConstants.DeploymentPoolsView,
            poolId: parseInt(urlState.poolid),
            tab: urlState.tab,
            targetId : parseInt(urlState.targetid)
        }
    }

    protected onUrlChange(): void {
        let urlState = Navigation_Services.getHistoryService().getCurrentState();
        let newState = {
            view: urlState.view || DPUtils.DeploymentPoolsConstants.DeploymentPoolsView,
            poolId: parseInt(urlState.poolid),
            tab: urlState.tab,
            targetId : parseInt(urlState.targetid)
        };

        this.setState(newState);
    }

    private _isDeploymemtPoolView(view: string, poolId: number): boolean {
        return view && Utils_String.equals(view, DPUtils.DeploymentPoolsConstants.DeploymentPoolView, true)
            && (!!poolId) && (poolId > 0);
    }

    private _isDeploymentTargetView(view: string, poolId: number, targetId: number) {
        return view && (poolId || poolId === 0) && Utils_String.equals(view, DPUtils.DeploymentPoolsConstants.DeploymentPoolView, true) && (targetId && targetId > 0);
    }

    private _setWindowTitle(title: string): void {
        var titleFormat = Context.getPageContext().webAccessConfiguration.isHosted ? VSS_Resources_Platform.PageTitleWithContent_Hosted : VSS_Resources_Platform.PageTitleWithContent;
        document.title = Utils_String.format(titleFormat, title || "");
    }

    private _urlStateChangeDelegate: IFunctionPPR<any, any, void>;
}

export function start(element: HTMLElement): void {
    ReactDOM.render(<DeploymentPoolsHub />, element);
    VSS.globalProgressIndicator.registerProgressElement($(".pageProgressIndicator"));
}
