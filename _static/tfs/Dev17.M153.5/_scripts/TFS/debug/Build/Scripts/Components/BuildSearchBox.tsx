import * as React from "react";

import { BuildSearchActionHub, SuccessPayload, FailurePayload } from "Build/Scripts/Actions/SearchBuilds";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { SearchBox } from "Presentation/Scripts/TFS/Components/SearchBox";
import { BuildsSource } from "Build/Scripts/Sources/Builds";
import { isValidId } from "Build/Scripts/Validator";

import { BuildLinks } from "Build.Common/Scripts/Linking";

import { Component as IdentityComponent } from "Presentation/Scripts/TFS/Components/IdentityImage";
import { IProps as ITfsReactProps } from "Presentation/Scripts/TFS/TFS.React";

import { Build } from "TFS/Build/Contracts";

import { getService as getEventService, CommonActions } from "VSS/Events/Action";
import { getCollectionService } from "VSS/Service";
import { announce } from "VSS/Utils/Accessibility";
import { format } from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!Build/BuildSearchBox";

export interface Props {
}

export interface State {
    results: Build[];
    loading: boolean;
    errorMessage: string;
}

export class BuildSearchBox extends React.Component<Props, State> {
    private _buildsSource: BuildsSource = null;
    private _searchActionHub: BuildSearchActionHub = new BuildSearchActionHub();

    constructor(props: Props) {
        super(props);

        this._buildsSource = getCollectionService(BuildsSource);

        this.state = {
            loading: false,
            results: null,
            errorMessage: null
        };
    }

    public render(): JSX.Element {
        const results = this.state.results || [];
        const resultsMessage = results.length > 0 ? format(BuildResources.SearchResultsAvailableMessage, results.length) : "";
        return <SearchBox loading={this.state.loading} errorMessage={this.state.errorMessage}
            placeholderText={BuildResources.BuildSearchPlaceHolderText} title={BuildResources.BuildSearchBoxTitle}
            onClear={this._onClear} onSearch={this._onSearch} onItemClick={this._onItemClick}
            searchResultsAvailableMessage={resultsMessage} onItemKeyDown={this._onItemKeyDown}>
            {
                results.map((build) => {
                    return <BuildSearchItem key={build.id} build={build} />;
                })
            }
        </SearchBox>;
    }

    public componentDidMount(): void {
        this._searchActionHub.searchSucceeded.addListener(this._onSearchSucceeded);
        this._searchActionHub.searchFailed.addListener(this._onSearchFailed);
    }

    public componentWillUnmount(): void {
        this._searchActionHub.searchSucceeded.removeListener(this._onSearchSucceeded);
        this._searchActionHub.searchFailed.removeListener(this._onSearchFailed);
    }

    private _onSearchSucceeded = (payload: SuccessPayload): void => {
        let items = payload.builds || [];
        if (items && items.length === 1) {
            // since we are navigating anyway, there is no point in setting loading state back to false
            this._navigateToBuild(items[0].id);
            return;
        }

        this.setState({
            loading: false,
            results: payload.builds,
            errorMessage: null
        });
    };

    private _onSearchFailed = (payload: FailurePayload): void => {
        this.setState({
            loading: false,
            results: null,
            errorMessage: payload.errorMessage
        });
    };

    private _onClear = (): void => {
        this.setState({
            loading: false,
            results: null,
            errorMessage: null
        });
    };

    private _onSearch = (text: string): void => {
        if (isValidId(text)) {
            // navigate to build summary using build Id, if build Id doesn't exist, that page handles, don't bother to validate buildId here
            this._navigateToBuild(parseInt(text, 10));
        }
        else {
            this._setBusyState();

            // initiate build number search
            this._buildsSource.searchBuilds(this._searchActionHub, text);
        }
    };

    private _onItemClick = (index: number): void => {
        if (this.state.results && this.state.results.length > index) {
            this._navigateToBuild(this.state.results[index].id);
        }
    };

    private _onItemKeyDown = (index: number): void => {
        if (this.state.results && this.state.results.length > index) {
            const build = this.state.results[index];
            announce(format(BuildResources.BuildSearchResultAnnounceMessage, build.buildNumber, build.definition.name, build.id), true);
        }
    };

    private _setBusyState() {
        this.setState({
            loading: true,
            results: null,
            errorMessage: null
        });
    }

    private _navigateToBuild(buildId: number) {
        getEventService().performAction(CommonActions.ACTION_WINDOW_NAVIGATE, {
            url: BuildLinks.getBuildDetailLink(buildId)
        });
    }
}

interface BuildSearchItemProps {
    build: Build;
}

const BuildSearchItem = (props: BuildSearchItemProps): JSX.Element => {
    let build = props.build;
    if (build) {
        let definition = build.definition;
        let definitionName: string = "";
        if (definition) {
            definitionName = definition.path != "\\" ? (definition.path + "\\" + definition.name) : definition.name;
        }

        return <div className="build-search-box-search-result">
            <IdentityComponent cssClass="identity-picture" identity={build.requestedFor} />
            <div className="text-container">
                <div className="primary-title"><a href={BuildLinks.getBuildDetailLink(build.id)}>{build.buildNumber}</a></div>
                <div title={definitionName} className="subtle-title">{definitionName}</div>
            </div>
        </div>;
    }
};