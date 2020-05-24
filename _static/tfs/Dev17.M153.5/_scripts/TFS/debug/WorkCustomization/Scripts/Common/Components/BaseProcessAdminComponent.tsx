/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";
import { Component, Props, State } from "VSS/Flux/Component";

import { IProcess } from "WorkCustomization/Scripts/Contracts/Process";
import { getWorkItemTypesStore, WorkItemTypesStore } from "WorkCustomization/Scripts/Stores/Process/WorkItemTypesStore";
import { UrlUtils } from "WorkCustomization/Scripts/Utils/UrlUtils";

import AdminProcessCommon = require("Admin/Scripts/TFS.Admin.Process.Common");
import { CommonUtils } from "WorkCustomization/Scripts/Utils/CommonUtils";

export abstract class BaseProcessAdminComponent<TProps extends Props, TState extends State> extends Component<TProps, TState> {
    protected _lastLoadedWitId: string = null;

    public shouldComponentUpdate(nextProps: TProps, nextState: TState): boolean {
        return UrlUtils.getCurrentWorkItemTypeIdFromUrl() !== this._lastLoadedWitId;
    }

    public getState(): TState {
        return this.state;
    }

    protected getStore(): WorkItemTypesStore {
        return getWorkItemTypesStore();
    }

    protected _toProcessDescriptorViewModel(process: IProcess): AdminProcessCommon.ProcessDescriptorViewModel {
        return new AdminProcessCommon.ProcessDescriptorViewModel(
            CommonUtils.NullFunction,
            [],
            null,
            null,
            // layout only uses the static data/option param:
            this._toProcessDescriptorViewModelOptions(process));
    }

    protected _toProcessDescriptorViewModelOptions(process: IProcess): AdminProcessCommon.IProcessDescriptorViewModelOptions {
        var processDescriptorViewModelOptions: AdminProcessCommon.IProcessDescriptorViewModelOptions;

        processDescriptorViewModelOptions = {
            templateTypeId: process.templateTypeId,
            name: process.name,
            description: process.description,
            isDefault: process.isDefault,
            referenceName: process.referenceName,
            inherits: process.parentTemplateTypeId,
            isInherited: process.isInheritedTemplate,
            isInheritedTemplate: process.isInheritedTemplate,
            isEnabled: process.isEnabled,
            editPermission: process.editPermission,
            isSystemTemplate: process.isSystemTemplate
        }

        return processDescriptorViewModelOptions;
    }
}