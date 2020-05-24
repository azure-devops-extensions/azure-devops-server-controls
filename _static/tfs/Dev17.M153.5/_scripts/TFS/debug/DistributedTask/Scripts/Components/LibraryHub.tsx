/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");

import Component_Base = require("VSS/Flux/Component");
import Navigation_Services = require("VSS/Navigation/Services");
import Utils_String = require("VSS/Utils/String");

import { Fabric } from "OfficeFabric/Fabric";

import { LibraryConstants } from "DistributedTask/Scripts/Constants";
import { LibraryItemsView } from "DistributedTask/Scripts/Components/LibraryItemsView";
import { VariableGroupView } from "DistributedTask/Scripts/Components/VariableGroupView";
import { SecureFileView } from "DistributedTask/Scripts/Components/SecureFileView";

export interface LibraryHubState extends Component_Base.State {
    view: string;
}

export class LibraryHub extends Component_Base.Component<Component_Base.Props, LibraryHubState> {

    constructor(props: Component_Base.Props) {
        super(props);
        let urlState = Navigation_Services.getHistoryService().getCurrentState();
        (this.state as LibraryHubState).view = urlState.view;
    }

    public render(): JSX.Element {
        if (this.isVariableGroupView(this.state.view)) {
            return (<Fabric> <VariableGroupView /> </Fabric>);
        } else if (this.isSecureFileView(this.state.view)) {
            return (<Fabric> <SecureFileView /> </Fabric>);
        } else {
            return (<Fabric> <LibraryItemsView /> </Fabric>);
        }
    }

    public componentWillMount() {
        // Attach to URL changes
        Navigation_Services.getHistoryService().attachNavigate(this.onUrlChange);
    }

    public componentWillUnmount() {
        Navigation_Services.getHistoryService().detachNavigate(this.onUrlChange);
    }

    protected getState(): LibraryHubState {
        return {
            view: this.state != null ? this.state.view : null
        };
    }

    protected onUrlChange = () => {
        let urlState = Navigation_Services.getHistoryService().getCurrentState();
        let state = this.getState();
        state.view = urlState.view;
        this.setState(state);
    }

    private isVariableGroupView(view: string): boolean {
        return view && Utils_String.equals(view, LibraryConstants.VariableGroupView, true);
    }

    private isSecureFileView(view: string): boolean {
        return view && Utils_String.equals(view, LibraryConstants.SecureFileView, true);
    }
}

export function start(element: HTMLElement): void {
    ReactDOM.render(<LibraryHub />, element);
}