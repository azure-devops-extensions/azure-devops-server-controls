/// <reference types="react-dom" />

import * as React from 'react';

import PresentationResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");

import { ViewMode, IColumn, ZeroDataExperienceViewMode, FetchingLinks } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import { IMainComponentState, FetchingDisplayData } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Interfaces";
import { LinkedArtifactsStore } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Flux/Store";
import { ActionsCreator } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Flux/ActionsCreator";

import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";

import * as LinksGridComponent_Async from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Components/LinksGridComponent";
import { LinksListComponent } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Components/LinksListComponent";
import { LoadingIndicatorComponent } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Components/LoadingIndicatorComponent";
import { ZeroDataComponent } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Components/ZeroDataComponent";
import { MessageComponent } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Components/MessageComponent";

export interface IMainComponentProps {
    store: LinkedArtifactsStore;
    actionsCreator: ActionsCreator;
    columns: IColumn[];

    onRender: Function;
}

// Component to display while delay loading Grid
let LoadingComponent: React.StatelessComponent<{}> = (): JSX.Element => {
    return <div>{PresentationResources.Loading}</div>;
};

// We want to delay load the grid view, it's not always used
const AsyncGridComponent = getAsyncLoadedComponent(
    ["Presentation/Scripts/TFS/Controls/LinkedArtifacts/Components/LinksGridComponent"],
    (m: typeof LinksGridComponent_Async) => m.LinksGridComponent,
    () => <LoadingComponent />);

export class MainComponent extends React.Component<IMainComponentProps, IMainComponentState> {
    private _storeListenerDelegate: Function;
    private _element: HTMLElement | null;

    constructor(props: IMainComponentProps, context?: any) {
        super(props, context);

        this.state = this.props.store.getState();
    }

    public componentDidMount() {
        this._storeListenerDelegate = this._onStoreChanged.bind(this);
        this.props.store.addChangedListener(this._storeListenerDelegate);

        // Control has been rendered, invoke handler
        this.props.onRender();
    }

    public componentWillUnmount() {
        this.props.store.removeChangedListener(this._storeListenerDelegate);
        this._storeListenerDelegate = null;
    }

    public componentDidUpdate() {
        // Control has been rendered, invoke handler
        this.props.onRender();
    }

    public render(): JSX.Element {
        var innerView: JSX.Element = null;
        let loadingIndicator: JSX.Element = null;

        if (this.state.linkedArtifactGroups.length === 0
            && this.state.fetchingDisplayData === FetchingDisplayData.Done
            && this.state.fetchingLinks === FetchingLinks.Done) {
            const zeroDisplayViewMode = this.state.displayOptions.zeroDataOptions.zeroDataExperienceViewMode;

            if (zeroDisplayViewMode !== ZeroDataExperienceViewMode.Hidden) {
                const { message, action, onRenderZeroData } = this.state.displayOptions.zeroDataOptions;

                if (onRenderZeroData) {
                    innerView = onRenderZeroData(message, action);
                } else {
                    innerView = <ZeroDataComponent action={action} message={message} />;
                }
            }
        } else {
            if (this.state.displayOptions.viewMode === ViewMode.List) {
                innerView = <LinksListComponent
                    actionsCreator={this.props.actionsCreator}
                    linkedArtifactGroups={this.state.linkedArtifactGroups}
                    columns={this.props.columns}
                    displayOptions={this.state.displayOptions}
                    hostArtifact={this.state.hostArtifact} />;
            } else {
                innerView = <AsyncGridComponent
                    actionsCreator={this.props.actionsCreator}
                    linkedArtifactGroups={this.state.linkedArtifactGroups}
                    columns={this.props.columns}
                    sortColumns={this.state.sortColumns}
                    displayOptions={this.state.displayOptions}
                    onDeleteLink={this._onDeleteLink}
                    hostArtifact={this.state.hostArtifact} />;
            }
        }

        if (this.state.fetchingDisplayData === FetchingDisplayData.InProgress || this.state.fetchingLinks === FetchingLinks.InProgress) {
            loadingIndicator = <LoadingIndicatorComponent />;
        }

        return <div className="la-main-component" tabIndex={-1} ref={ ref => { this._element = ref; } }>
            <MessageComponent message={this.state.message} />
            {loadingIndicator}
            {innerView}
        </div>;
    }

    private _onDeleteLink = () => {
        if (this._element) {
            this._element.focus();
        }
    }

    private _onStoreChanged() {
        this.setState(this.props.store.getState());
    }
}
