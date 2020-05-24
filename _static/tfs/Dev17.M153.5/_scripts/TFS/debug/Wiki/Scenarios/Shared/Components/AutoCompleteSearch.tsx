import * as React from "react";
import * as ReactDOM from "react-dom";

import { DefaultButton } from "OfficeFabric/Button";
import { Callout, DirectionalHint } from "OfficeFabric/Callout";
import { FocusZone } from "OfficeFabric/FocusZone";
import { List } from "OfficeFabric/List";
import { ISearchBox, SearchBox } from "OfficeFabric/SearchBox";
import { autobind } from "OfficeFabric/Utilities";
import * as Utils_String from "VSS/Utils/String";

import { WikiV2 } from "TFS/Wiki/Contracts";
import { getPageNameFromPath, localeCaseInsensitiveContains } from "Wiki/Scripts/Helpers";

import { ActionCreator } from "Wiki/Scenarios/Integration/PagePicker/ActionCreator";
import { ActionsHub } from "Wiki/Scenarios/Integration/PagePicker/ActionsHub";
import { StoresHub } from "Wiki/Scenarios/Integration/PagePicker/StoresHub";
import { WikiPagesSource } from "Wiki/Scenarios/Shared/Sources/WikiPagesSource";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Shared/Components/AutoCompleteSearch";

export interface AutoCompleteSearchProps {
    wiki: WikiV2;
    onPageChange(pagePath: string): void;
    onSearch(value: string): void;
}

export interface AutoCompleteSearchState {
    showAutocomplete: boolean;
    searchText: string;
    pageMatches: string[];
}

export class AutoCompleteSearch extends React.PureComponent<AutoCompleteSearchProps, AutoCompleteSearchState> {
    private _searchIconContainerNode: Node;
    private _searchBoxRef: ISearchBox;
    private _actionCreator: ActionCreator;
    private _actionsHub: ActionsHub;
    private _storesHub: StoresHub;

    constructor(props: AutoCompleteSearchProps) {
        super(props);

        this._actionsHub = new ActionsHub();
        this._storesHub = new StoresHub(this._actionsHub);

        this.state = {
            showAutocomplete: false,
            searchText: "",
            pageMatches: [],
        };
    }

    public componentDidMount(): void {
        if (this.actionCreator) {
            this.actionCreator.getAllPages();
        }

        const searchBox = ReactDOM.findDOMNode(this._searchBoxRef as any) as Element;
        if (searchBox && searchBox.firstChild) {
            this._searchIconContainerNode = searchBox.firstChild;
            this._searchIconContainerNode.addEventListener("click", this._onSearchButtonClick);
        }
    }

    public componentWillUnmount(): void {
        if (this._searchIconContainerNode) {
            this._searchIconContainerNode.removeEventListener("click", this._onSearchButtonClick);
            this._searchIconContainerNode = null;
        }
    }

    public componentDidUpdate(): void {
        if (this._storesHub.getState().wikiPagesState.areAllPagesFetched) {
            return;
        }

        if (this.actionCreator) {
            this.actionCreator.getAllPages();
        }
    }

    public render(): JSX.Element {
        const searchBoxClassName = "micropedia-header-search-box";

        return (
            <FocusZone
                className={"auto-complete-search"}
            >
                <SearchBox
                    className={searchBoxClassName}
                    componentRef={this._setSearchBoxref}
                    value={this.state.searchText}
                    onChange={this._onChange}
                    onClear={this._onClear}
                    onFocus={this._onFocus}
                    onSearch={this.props.onSearch}
                />
                {this._shouldShowAutoComplete &&
                    <Callout
                        calloutMaxHeight={256}
                        calloutWidth={510}
                        directionalHint={DirectionalHint.bottomCenter}
                        directionalHintFixed={true}
                        doNotLayer={true}
                        isBeakVisible={false}
                        onDismiss={this._onDismiss}
                        target={`.${searchBoxClassName}`}
                    >
                        <List
                            items={this.state.pageMatches}
                            onRenderCell={this._onRenderItem}
                        />
                    </Callout>
                }
            </FocusZone>
        );
    }

    private get actionCreator(): ActionCreator {
        if (!this._actionCreator && this.props.wiki) {
            const wikiPagesSource = new WikiPagesSource(this.props.wiki, this.props.wiki.versions[0]);
            this._actionCreator = new ActionCreator(
                this._actionsHub,
                {
                    wikiPagesSource: wikiPagesSource,
                },
                this._storesHub.getState
            );
        }

        return this._actionCreator;
    }

    private get _shouldShowAutoComplete(): boolean {
        return this.state.showAutocomplete
            && this.state.searchText
            && this.state.pageMatches
            && this.state.pageMatches.length > 0;
    }

    @autobind
    private _onChange(searchText: string): void {
        if (this.state.searchText && !searchText) {
            this.setState({ searchText: "" });

            return;
        }

        if (Utils_String.localeIgnoreCaseComparer(this.state.searchText, searchText) === 0) {
            return;
        }

        this.setState({
            searchText
        });

        const pageMatches: string[] = [];

        for (const pagePath of Object.keys(this._storesHub.getState().wikiPagesState.wikiPages)) {
            const pageName: string = getPageNameFromPath(pagePath);
            if (localeCaseInsensitiveContains(pageName, searchText)) {
                pageMatches.push(pagePath);
            }
        }

        this.setState({
            showAutocomplete: true,
            pageMatches: pageMatches,
        });
    }

    @autobind
    private _onClear(): void {
        this.setState({ searchText: "" });
    }

    @autobind
    private _onDismiss(): void {
        this.setState({ showAutocomplete: false });
    }

    @autobind
    private _onFocus(): void {
        if (this.state.searchText) {
            this.setState({ showAutocomplete: true });
        }
    }

    @autobind
    private _onPageChange(pagePath: string): void {
        this.setState({ searchText: "" });

        if (this.props.onPageChange) {
            this.props.onPageChange(pagePath);
        }

        // Deliberately set focus back on the search box
        if (this._searchBoxRef) {
            this._searchBoxRef.focus();
        }
    }

    @autobind
    private _onRenderItem(pagePath: string) {
        return (
            <RowItem
                pagePath={pagePath}
                onPageChange={this._onPageChange}
            />
        );
    }

    @autobind
    private _onSearchButtonClick(): void {
        this.props.onSearch(this.state.searchText);
    }

    @autobind
    private _setSearchBoxref(ref: ISearchBox): void {
        this._searchBoxRef = ref;
    }
}

interface RowItemProps {
    pagePath: string;
    onPageChange?(pagePath: string): void;
}

class RowItem extends React.PureComponent<RowItemProps, {}>{
    public constructor(props: RowItemProps) {
        super(props);
    }

    public render(): JSX.Element {
        return (
            <DefaultButton
                className={"auto-complete-row-item"}
                onClick={this._onItemClick}
                role={"link"}
                text={getPageNameFromPath(this.props.pagePath)}
            />
        );
    }

    @autobind
    private _onItemClick(): void {
        if (this.props.onPageChange) {
            this.props.onPageChange(this.props.pagePath);
        }
    }
}
