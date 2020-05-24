// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />
/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");
import Context = require("VSS/Context");
import Component_Base = require("VSS/Flux/Component");
import Navigation_Controls = require("VSS/Controls/Navigation");
import Navigation_Services = require("VSS/Navigation/Services");
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Utils_String = require("VSS/Utils/String");
import Utils_Core = require("VSS/Utils/Core");
import VSS = require("VSS/VSS");

import MGUtils = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Utils");
import Resources = require("ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline");
import Component_MachineGroups = require("ReleasePipeline/Scripts/MachineGroup/Components/MachineGroups");
import Component_MachineGroup = require("ReleasePipeline/Scripts/MachineGroup/Components/MachineGroup");
import PerformanceTelemetry = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.PerformanceTelemetry");
import {PerfScenariosConstants} from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";
import Component_DeploymentMachine = require("ReleasePipeline/Scripts/MachineGroup/Components/DeploymentMachineDetails");
import "VSS/LoaderPlugins/Css!RM:ReleasePipeline/Scripts/MachineGroup/Components/MachineGroupsHub";

export interface MachineGroupsHubProps extends Component_Base.Props {
}

export interface MachineGroupsHubState extends Component_Base.State {
    view: string;
    tab?: string;
    machineGroupId?: number;
    machineId?: number;
    machineDetailsTab?: string;
}

export class MachineGroupsHub extends Component_Base.Component<MachineGroupsHubProps, MachineGroupsHubState> {
    constructor(props: MachineGroupsHubProps) {
        super(props);
        this._urlStateChangeDelegate = Utils_Core.delegate(this, this.onUrlChange);
    }

    public render(): JSX.Element {
        let state = this._getState();
        let tab: string

        if(this._isDeploymentMachineView(state.view, state.machineGroupId, state.machineId)) {
            this._setWindowTitle(Resources.DeploymentTargetPageTitle);
            return (<div>
                <div className="hub-progress pageProgressIndicator" />
                    <Component_DeploymentMachine.DeploymentMachine mgid = {state.machineGroupId} tab = {state.machineDetailsTab} machineid = {state.machineId} />
            </div>);
        }

        if (this._isMachineGroupView(state.view, state.machineGroupId)) {
            this._setWindowTitle(Resources.DeploymentGroupPageTitle);
            return (<div>
                <div className="hub-progress pageProgressIndicator" />
                    <Component_MachineGroup.MachineGroup mgId = {state.machineGroupId} tab = {state.tab} machineId = {state.machineId} machineDetailsTab = {state.machineDetailsTab}/>
            </div>);
        }

        PerformanceTelemetry.PerformanceUtil.startPageInteractiveScenarioFromNavigation(PerfScenariosConstants.LandingOnMachineGroupHubScenario);
        this._setWindowTitle(Resources.DeploymentGroupsPageTitle);
        return (<div>
            <div className="hub-progress pageProgressIndicator" />
                <Component_MachineGroups.MachineGroups tab={(state.tab ? state.tab : MGUtils.MachineGroupsConstants.AllTab)} />
        </div>);
    }

    protected _getState(): MachineGroupsHubState {
        if(this.state){
            return this.state;
        }

        let urlState = Navigation_Services.getHistoryService().getCurrentState();
        return {
            view: urlState.view,
            tab: urlState.tab,
            machineGroupId: parseInt(urlState.mgid),
            machineId : parseInt(urlState.machineid),
            machineDetailsTab : urlState.machinedetailstab
        };
    }

    public componentDidMount() {
        super.componentDidMount();
        // Attach to URL changes
        Navigation_Services.getHistoryService().attachNavigate(this._urlStateChangeDelegate);
    }

    public componentWillUnmount() {
        Navigation_Services.getHistoryService().detachNavigate(this._urlStateChangeDelegate);
        super.componentWillUnmount();
    }

    private _isMachineGroupView(view: string, mgid: number) {
        return view && (mgid || mgid === 0) && Utils_String.equals(view, MGUtils.MachineGroupsConstants.MachineGroupView, true);
    }
    
    private _isDeploymentMachineView(view: string, mgid: number, machineid: number) {
        return view && (mgid || mgid === 0) && Utils_String.equals(view, MGUtils.MachineGroupsConstants.MachineGroupView, true) && (machineid && machineid > 0);
    }

    private _setWindowTitle(title: string): void {
        var titleFormat = Context.getPageContext().webAccessConfiguration.isHosted ? VSS_Resources_Platform.PageTitleWithContent_Hosted : VSS_Resources_Platform.PageTitleWithContent;
        document.title = Utils_String.format(titleFormat, title || "");
    }

    protected onUrlChange(): void {
        let urlState = Navigation_Services.getHistoryService().getCurrentState();
        let newState = {
            view: urlState.view,
            tab: urlState.tab,
            machineGroupId: parseInt(urlState.mgid),
            machineId : parseInt(urlState.machineid),
            machineDetailsTab : urlState.machinedetailstab
        };

        this.setState(newState);
    }

    private _urlStateChangeDelegate: IFunctionPPR<any, any, void>;
}

export function start(element: HTMLElement): void {
    ReactDOM.render(<MachineGroupsHub />, element);
    VSS.globalProgressIndicator.registerProgressElement($(".pageProgressIndicator"));
}
