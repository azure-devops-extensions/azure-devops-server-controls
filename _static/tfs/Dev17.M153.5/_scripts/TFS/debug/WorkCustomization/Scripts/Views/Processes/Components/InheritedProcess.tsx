/// <reference types="react" />

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!WorkCustomization/Common/Components/ProcessNavPage";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { Component, Props, State } from "VSS/Flux/Component";
import { Spinner, SpinnerType } from "OfficeFabric/Spinner";
import { CreateProcessToMigrateProjectRequestPayload } from "WorkCustomization/Scripts/Contracts/CreateProcessToMigrateProject";
import { ICreateInheritedProcessRequestPayload } from "WorkCustomization/Scripts/Contracts/Process";
import { CreateInheritedProcessActionCreator } from "WorkCustomization/Scripts/Views/Processes/Actions/CreateInheritedProcess";
import { UrlUtils } from "WorkCustomization/Scripts/Utils/UrlUtils";
import { MessageBar } from "WorkCustomization/Scripts/Common/Components/MessageBar";
import StringUtils = require("VSS/Utils/String");
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import { NavigationParameters } from "WorkCustomization/Scripts/Constants";
import { getProcessesDataStore, ProcessesDataStore } from "WorkCustomization/Scripts/Stores/ProcessesDataStore";

var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

export class InheritedProcess extends Component<Props, State> {
    private static ErrorBarId: string = "create-inherited-process";

    render(): JSX.Element {
        return (
            <div className="hub-content">
                <MessageBar id={InheritedProcess.ErrorBarId} />
                <Spinner type={SpinnerType.large} />
            </div>
        );
    }

    public componentDidMount(): void {
        let urlData: CreateProcessToMigrateProjectRequestPayload = UrlUtils.getCreateProcessToMigrateProjectRequest();

        let payload: ICreateInheritedProcessRequestPayload = {
            projectId: urlData.projectId,
            workItemType: urlData.workItemTypeId,
            processName: this._generateNewProcessName(),
            parentProcessTypeId: this.getStore().getProcessByName(UrlUtils.getParameterValue(NavigationParameters.WizardProcessName)).templateTypeId
        };

        CreateInheritedProcessActionCreator.beginCreateInheritedProcess(payload, InheritedProcess.ErrorBarId);
    }

    public getStore(): ProcessesDataStore {
        return getProcessesDataStore();
    }

    private _processExists(processName: string): boolean {
        return this.getStore().getProcessByName(processName) !== null;
    }

    private _generateNewProcessName(): string {
        let prefix = tfsContext.isHosted ? tfsContext.contextData.account.name : Resources.OnPremCustomProcessDefaultPrefix;
        let baseName = StringUtils.format(Resources.NewProcessNameTemplate, prefix, UrlUtils.getParameterValue(NavigationParameters.WizardProcessName));
        let processName = baseName;

        let idx: number = 1;

        while (this._processExists(processName)) {
            processName = StringUtils.format("{0} {1}", baseName, idx++);
        }
        return processName;
    }
}