/// <reference types="react" />

import * as React from "react";

import { autobind } from "OfficeFabric/Utilities";
import * as Utils_String from "VSS/Utils/String";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

import { HubErrorBarStore } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Stores/HubErrorBarStore";
import { IHubErrorMessageState } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Contracts";

export interface IHubErrorMessageProps {
    store?: HubErrorBarStore;
}

export class HubErrorBar extends React.Component<IHubErrorMessageProps, IHubErrorMessageState> {

    constructor(props: IHubErrorMessageProps) {
        super(props);

        this._store = props.store;
        if (!this._store) {
            this._store = HubErrorBarStore.getInstance();
        }
        this.state = {};
    }
    private _store: HubErrorBarStore; 

    public render(): JSX.Element {
        if (!this.state.errorMessage) {
            return null;
        }

        return <div className="testplan-directory-messagebar" >
            <MessageBar
                messageBarType={MessageBarType.error}
                onDismiss={() => { this.setState({ errorMessage: Utils_String.empty }); }}>
                {this.state.errorMessage}
            </MessageBar>
        </div>;
    }

    public componentWillMount() {
        this._store.addChangedListener(this._onStoreChanged);
    }

    public componentWillUnmount(): void {
        // Remove listener
        this._store.removeChangedListener(this._onStoreChanged);
    }

    /**
     * Update state when store is updated
     */
    @autobind
    private _onStoreChanged(): void {
        this.setState(this.props.store.getState());
    }
}