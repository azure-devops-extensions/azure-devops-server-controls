/// <reference types="react-dom" />

import React = require("react");
import Component_Base = require("VSS/Flux/Component");
import Events_Services = require("VSS/Events/Services");

import Constants = require("DistributedTask/Scripts/Constants");
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

export interface Props extends Component_Base.Props {
    errorMessage?: string;
}

export class ErrorMessageBar extends Component_Base.Component<Props> {
    constructor(props: Props) {
        super(props);
    }

    public render(): JSX.Element {
        return !!(this.props.errorMessage) ? 
        (<div className="lib-title-error">
            <MessageBar messageBarType={MessageBarType.error} onDismiss={() => { Events_Services.getService().fire(Constants.LibraryActions.ClearErrorMessage); }}>
                {this.props.errorMessage}
            </MessageBar>
        </div>) : null;
    }
}