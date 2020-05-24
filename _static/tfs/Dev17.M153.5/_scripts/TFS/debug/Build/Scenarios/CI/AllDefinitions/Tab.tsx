import * as React from "react";

import { AllDefinitionsStore } from "Build/Scenarios/CI/AllDefinitions/Stores/AllDefinitions";

import { BuildDefinition } from "TFS/Build/Contracts";

import {
    IAllDefinitionsTabProps,
    IAllDefinitionsTabState
} from "./Tab.types";

import {
    IAllDefinitionsProviderData,
} from "./Stores/AllDefinitions.types";

export class AllDefinitionsTab extends React.Component<IAllDefinitionsTabProps, IAllDefinitionsTabState>{
    private _store: AllDefinitionsStore;
    private _mounted: boolean = false;

    constructor(props: IAllDefinitionsTabProps) {
        super(props);
        this._store = props.store || new AllDefinitionsStore({});
        this.state = {
            definitions: []
        };
    }

    public render() {
        return <div>
            Render all definitions {this.state.definitions.length} content here!
        </div>;
    }

    public componentDidMount() {
        this._mounted = true;
        this._store.addChangedListener(this._updateState);
        this._store.fetchData(this.props.refreshDataOnMount);
    }

    public componentWillUnmount() {
        this._mounted = false;
        this._store.removeChangedListener(this._updateState);
        this._store.dispose();
    }

    private _getState() {
        return {
            definitions: this._store.getDefinitions()
        } as IAllDefinitionsTabState;
    }

    private _updateState = () => {
        if (this._mounted) {
            this.setState(this._getState());
        }
    }
}