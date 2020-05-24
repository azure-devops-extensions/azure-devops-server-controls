import * as React from "react";

import { AllDefinitionsSearchEvents, getAllDefinitionsSearchEventManager, AllDefinitionsSearchEventManager } from "Build/Scripts/Events/AllDefinitionsSearchEvents";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";

import { BaseComponent } from "OfficeFabric/Utilities";

import { SearchBox, Props as ISearchBoxProps } from "Presentation/Scripts/TFS/Components/SearchBox";

export interface IAllDefinitionsSearchBoxState {
    searchResultsAvailableMessage: string;
}

const SEARCH_INPUT_CHANGE_DELAY = 500;

export class AllDefinitionsSearchBox extends BaseComponent<ISearchBoxProps, IAllDefinitionsSearchBoxState> {
    private _eventManager: AllDefinitionsSearchEventManager = null;
    constructor(props: ISearchBoxProps) {
        super(props);
        this._eventManager = getAllDefinitionsSearchEventManager();
        this.state = {
            searchResultsAvailableMessage: null
        };

        this._onChanged = this._async.debounce(this._onChanged, SEARCH_INPUT_CHANGE_DELAY, {
            leading: false
        });
    }

    public render(): JSX.Element {
        return <SearchBox
            searchResultsAvailableMessage={this.state.searchResultsAvailableMessage}
            onChanged={this._onChanged}
            {...this.props} />;
    }

    public componentDidMount(): void {
        this._eventManager.addEventGroupListener(AllDefinitionsSearchEvents.SEARCH_RESULTS_AVAILABLE, this._sendMessage);
    }

    public componentWillUnmount(): void {
        this._eventManager.removeEventGroupListener(AllDefinitionsSearchEvents.SEARCH_RESULTS_AVAILABLE, this._sendMessage);
    }

    private _onChanged = (text: string): void => {
        this.props.onChanged && this.props.onChanged(text);
    }

    private _sendMessage = (message: string) => {
        this.setState({
            searchResultsAvailableMessage: message
        });
    }
}