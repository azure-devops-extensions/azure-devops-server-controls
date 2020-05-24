// Copyright (c) Microsoft Corporation.  All rights reserved.

import Store_Base = require("VSS/Flux/Store");

import Model = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Model");
import Machine_Actions = require("ReleasePipeline/Scripts/MachineGroup/Actions/MachineActions");

export class MachineConfigurationStore extends Store_Base.Store {
    constructor() {
        super();
        Machine_Actions.machineConfigurationLoaded.addListener(this.onDataLoad, this);
    }

    public getData(): Model.MachineConfiguration[] {
        return this._machineConfigurations;
    }

    protected onDataLoad(data: Model.MachineConfiguration[]) {
        this._machineConfigurations = data;
        this.emitChanged();
    }

    protected _machineConfigurations: Model.MachineConfiguration[];
}

export var Configuration = new MachineConfigurationStore();
