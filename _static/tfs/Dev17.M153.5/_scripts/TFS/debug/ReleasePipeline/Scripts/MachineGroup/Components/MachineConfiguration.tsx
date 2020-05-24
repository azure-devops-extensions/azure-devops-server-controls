// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />
/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");
import Component_Base = require("VSS/Flux/Component");

import { DetailsList, IColumn, CheckboxVisibility , DetailsListLayoutMode, ConstrainMode} from 'OfficeFabric/DetailsList';
import { TooltipHost, TooltipDelay } from "VSSUI/Tooltip";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";

import Model = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Model");
import Resources = require("ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline");
import ConfigurationStore = require("ReleasePipeline/Scripts/MachineGroup/Stores/MachineConfigurationStore");
import MachineActionCreator = require("ReleasePipeline/Scripts/MachineGroup/Actions/MachineActionCreator");
import PerformanceTelemetry = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.PerformanceTelemetry");
import { PerfScenariosConstants } from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";
import RMUtilsCore = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core");
import "VSS/LoaderPlugins/Css!RM:ReleasePipeline/Scripts/MachineGroup/Components/MachineConfiguration";

export interface Props extends Component_Base.Props {
    actionCreator?: MachineActionCreator.MachineActionCreator;
    mgid: number;
    machineId: number;
}

export interface State extends Component_Base.State {
    machineConfigurations: Model.MachineConfiguration[];
    dataLoaded: boolean;
}

export class MachineConfiguration extends Component_Base.Component<Props, State> {
    constructor(props: Props) {
        super(props);

        this._machineActionCreator = this.props.actionCreator || MachineActionCreator.ActionCreator
        this._machineConfigurationStore = ConfigurationStore.Configuration;
    }

    public render(): JSX.Element {


        return (<div className="machine-configuration-view" role="tabpanel" aria-labelledby="pivotview-header-Configuration">
            <div className= "machine-configuration-left-view">
                        <DetailsList
                            items={ this._getState().machineConfigurations }
                            setKey='set'
                            isHeaderVisible = {true}
                            constrainMode={ConstrainMode.horizontalConstrained}
                            layoutMode={DetailsListLayoutMode.justified}
                            columns={ this._getColumns() }
                            onRenderItemColumn={ this._renderItemColumn }
                            checkboxVisibility ={ CheckboxVisibility.hidden }
                            className="machine-configuration-details-list"
                            />
                    </div>
               </div>);
    }

    public componentDidMount() {
        super.componentDidMount();
        this._machineConfigurationStore.addChangedListener(this._onStoreChange);
        if(this.props.machineId){
            this._machineActionCreator.loadMachineConfiguration(this.props.mgid, this.props.machineId);
        }
    }

    public componentWillUpdate(nextProps: Props) {
        if(nextProps.machineId && this.props.machineId !== nextProps.machineId){
            this.setState({machineConfigurations: [], dataLoaded: false})
            this._machineActionCreator.loadMachineConfiguration(nextProps.mgid, nextProps.machineId);
        }
    }

    public componentWillUnmount() {
        this._machineConfigurationStore.removeChangedListener(this._onStoreChange);
        super.componentWillUnmount();
    }

    private _getColumns(): IColumn[] {

        var propertyName = Resources.PropertyName;
        var propertyValue = Resources.PropertyValue;

        return [
            {
                key: "name",
                name: propertyName,
                fieldName: "",
                minWidth: 200,
                maxWidth: 300,
                className: "machine-configuration-column-cell",
                headerClassName: "machine-configuration-header"
            },
            {
                key: "value",
                name: propertyValue,
                fieldName: "",
                minWidth: 300,
                maxWidth: 400,
                className: "machine-configuration-column-cell"
            }
        ];
    }

    private _renderItemColumn(item, index, column) {
        let fieldContent = item[column.fieldName];
        let itemElement: JSX.Element = null;

        switch (column.key) {
            case 'name':
                return (
                    <div className="machine-configuration-name">{item.name}</div>
                );
            case 'value':
                return (
                    <div className="machine-configuration-value">{item.value}</div>
                );
            default:
                return <span>{ fieldContent }</span>;
        }
    }

    private _onStoreChange = () => {
        let state = this._getState();
        state.machineConfigurations = this._machineConfigurationStore.getData();
        state.dataLoaded = true;
        this.setState(state);
        PerformanceTelemetry.PerformanceUtil.endScenario(PerfScenariosConstants.ViewMachineConfigurationsScenario);
    }

    private _getState(): State {
        if (this.state) {
            return this.state;
        }
        return { machineConfigurations: [], dataLoaded: false};
    }

    private _machineActionCreator: MachineActionCreator.MachineActionCreator;
    private _machineConfigurationStore: ConfigurationStore.MachineConfigurationStore;
}
