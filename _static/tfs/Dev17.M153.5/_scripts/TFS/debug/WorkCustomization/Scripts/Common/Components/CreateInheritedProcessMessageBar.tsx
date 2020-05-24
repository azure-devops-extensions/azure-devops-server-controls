/// <reference types="react" />

import * as React from "react";
import { Component, Props, State } from "VSS/Flux/Component";
import { CreateInheritedProcessMessageStore } from "WorkCustomization/Scripts/Common/Stores/CreateInheritedProcessMessageStore";
import * as FabricMessageBar from "OfficeFabric/MessageBar";
import { clearCreateInheritedProcessAction } from "WorkCustomization/Scripts/Common/Actions/CreateInheritedProcessMessageBarAction";
import { autobind } from "OfficeFabric/Utilities";
import { Link } from "OfficeFabric/Link";
import * as Tooltip from "VSSUI/Tooltip";
import { IProcess } from "WorkCustomization/Scripts/Contracts/Process";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");
import Utils_String = require("VSS/Utils/String");
import { UrlUtils } from "WorkCustomization/Scripts/Utils/UrlUtils";
import * as DialogActions from "WorkCustomization/Scripts/Dialogs/Actions/DialogActions";
import { getNavPageForTabGroup } from "WorkCustomization/Scripts/WorkCustomizationHub"
import { ProcessCustomizationTelemetry } from "WorkCustomization/Scripts/Utils/Telemetry";

export interface MessageBarProps extends Props {
    id?: string
}

export interface ICreateInheritedProcessMessageBarState {
    process: IProcess;
}

export class CreateInheritedProcessMessageBar extends Component<MessageBarProps, ICreateInheritedProcessMessageBarState>
{
    private _store: CreateInheritedProcessMessageStore;

    constructor(props: Props) {
        super(props);
        this._store = new CreateInheritedProcessMessageStore();
    }
    
    render() {
        
        // if there is error show only error bar
        if (!this.state.process) {
            return null;
        }

        let process: IProcess = this.state.process;

        let withoutLinkMessage: string = process.isSystemTemplate ?
                Resources.SystemProcessCannotEditMessageWithoutLinkPart :
            Utils_String.format(Resources.XMLProcessCannotEditMessage, UrlUtils.getAllProcessUrl());

        let linkElem = process.isSystemTemplate ?
            (<Link onClick={(ev?: React.MouseEvent<HTMLElement>) => this._onClickLink(ev, process)}>
                <span>{Resources.SystemProcessCannotEditMessageLinkPart}</span>
            </Link>) : null;

        return (
            <div className={this.props.cssClass}>
                <span className={"inline text-dark change-link"}>{withoutLinkMessage}</span>
                {linkElem}
            </div>);
    }

    public _onClickLink(ev: React.MouseEvent<HTMLElement>, process: IProcess): void {
        // Log telemetry
        ProcessCustomizationTelemetry.onProcessCreateFromOOBProcessPageMessage(process.name);

        DialogActions.setDialogAction.invoke({
                dialogType: DialogActions.DialogType.CreateProcess,
                data: {
                    parentProcessName: process.name,
                    parentTemplateTypeId: process.templateTypeId,
                    isInputDisabled: !process.createPermission,
                    upfrontErrorMessage: process.createPermission ? null : Resources.CreateProcessPermissionError,
                    navigate: true
                }
        });
    }

    public getState(): ICreateInheritedProcessMessageBarState {
        return { process: this._store && this._store.process }
    }

    public getStore(): CreateInheritedProcessMessageStore {
        return this._store;
    }

    public componentWillUnmount(): void {
        super.componentWillUnmount();
        this._store.dispose();
    }

    @autobind
    private _onDismissMessage(): void {
        clearCreateInheritedProcessAction.invoke(null);
    }
}