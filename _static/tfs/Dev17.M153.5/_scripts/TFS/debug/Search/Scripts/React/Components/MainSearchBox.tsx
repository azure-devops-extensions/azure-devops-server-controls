import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Models from "Search/Scripts/React/Models";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_Url from "VSS/Utils/Url";

import { autobind } from "OfficeFabric/Utilities";
import { ActionCreator } from "Search/Scripts/React/ActionCreator";
import { AccountsComponent } from "Search/Scripts/React/Components/AccountsControl";
import { StoresHub } from "Search/Scripts/React/StoresHub";
import { using } from "VSS/VSS";

import { Label } from "OfficeFabric/Label";
import { Link } from "OfficeFabric/Link";
import { css } from "OfficeFabric/Utilities";
import { NavigationContextLevels } from "VSS/Common/Contracts/Platform";
import { KeyCode } from "VSS/Utils/UI";
import { TfsContext, IRouteData } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import * as Tfs_Host_UI_NO_REQUIRE from "Presentation/Scripts/TFS/TFS.Host.UI";

import * as Helpers_NO_REQUIRE from "Search/Scripts/Common/TFS.Search.Helpers";
import * as CodeSearchDropdown_NO_REQUIRE from "Search/Scripts/Providers/Code/TFS.Search.FilterDropdown";
import * as WorkItemSearchDropdown_NO_REQUIRE from "Search/Scripts/Providers/WorkItem/Controls/TFS.Search.WorkItem.Controls.SearchBoxDropdown";

import { SearchConstants } from "Search/Scripts/Common/TFS.Search.Constants";
import { SearchBox, SearchAccountLink } from "Search/Scripts/React/Components/SearchBox";
import * as Search_Resources from "Search/Scripts/Resources/TFS.Resources.Search";

import "VSS/LoaderPlugins/Css!Search/React/Components/MainSearchBox";

export interface IMainSearchBoxSectionProps {
    actionCreator: ActionCreator;
    storesHub: StoresHub;
    featureAvailabilityStates: IDictionaryStringTo<boolean>;
    currentPageContext: NavigationContextLevels;
}

export interface IMainSearchBoxSectionState {
    searchEntity: Models.SearchProvider;
    defaultSearchText: string;
}

/**
 * React layer to render main search box.
 * Could've rendered MainSearchBox directly in the page, but then the component would take dependency on StoresHub so that
 * it updates its behaviour based on the current active search entity.
 */
export class MainSearchBoxSection extends React.Component<IMainSearchBoxSectionProps, IMainSearchBoxSectionState> {
    private _viewState: IMainSearchBoxSectionState;

    constructor(props: IMainSearchBoxSectionProps) {
        super(props);
        this._viewState = {
            searchEntity: props.storesHub.searchProvidersStore.CurrentProvider,
            defaultSearchText: ""
        } as IMainSearchBoxSectionState;

        this.state = this._viewState;
    }

    /**
     * Just render the search box component.
     */
    public render(): JSX.Element {
        const isProjectContext = this.props.currentPageContext >= NavigationContextLevels.Project;
        const url = Utils_Url.Uri.parse(window.location.href);

        let params: IRouteData = {};
        url.queryParameters.forEach((param, index) => {
            if (param.name === "type" || param.name === "text" || param.name === "_a") {
                params[param.name] = param.value;
            }
        });
        params["project"] = null;

        const tfsContext = TfsContext.getDefault();
        const accountUrl = tfsContext.getCollectionActionUrl(tfsContext.contextData.collection.name, "", "search", params);

        const isContextAware = this.props.featureAvailabilityStates.contextualNavigationEnabled;
        const labelValue = isProjectContext
            ? Search_Resources.LabelForProjectContext
            : Search_Resources.LabelForAccountContext;

        return (
            <div className="search-section">
                <SearchBoxWithDropDown
                    contextLabel={isContextAware ? labelValue : undefined}
                    searchEntity={this.state.searchEntity}
                    defaultSearchText={this.state.defaultSearchText} />
                {
                    this.props.featureAvailabilityStates.crossAccountEnabled &&
                    (!this.props.featureAvailabilityStates.contextualNavigationEnabled || !isProjectContext) &&
                    <AccountsComponent actionCreator={this.props.actionCreator} storesHub={this.props.storesHub} />
                }
                {
                    isProjectContext && this.props.featureAvailabilityStates.contextualNavigationEnabled &&
                    <SearchAccountLink url={accountUrl} />
                }
            </div>);
    }

    /**
     * Bind to changes in SearchProvidersStore. Re-render whenever the current provider changes.
     */
    public componentDidMount(): void {
        this.props.storesHub.searchProvidersStore.addChangedListener(this._onProvidersUpdated);
        this.props.storesHub.requestUrlStore.addChangedListener(this._onUrlChanged);
    }

    @autobind
    private _onProvidersUpdated(): void {
        this._viewState.searchEntity = this.props.storesHub.searchProvidersStore.CurrentProvider;
        this.setState(this._viewState);
    }

    @autobind
    private _onUrlChanged(): void {
        const urlState = this.props.storesHub.requestUrlStore.getUrlState;
        this._viewState.defaultSearchText = urlState.urlState.text;
        this.setState(this._viewState);
    }
}

interface IMainSearchBoxProps {
    contextLabel?: string;
    searchEntity: Models.SearchProvider;
    defaultSearchText: string;
}

interface IMainSearchBoxState {
    text: string;
    focussed: boolean;
}

class SearchBoxWithDropDown extends React.Component<IMainSearchBoxProps, IMainSearchBoxState> {
    private _dropdownContainer: HTMLDivElement;
    private _dropdownControl: Tfs_Host_UI_NO_REQUIRE.ISearchBoxDropdownControl;
    private _searchBox: HTMLElement;
    private _textBox: HTMLInputElement;
    private _isDropdownSupported;
    constructor(props: IMainSearchBoxProps) {
        super(props);
        this._isDropdownSupported = isDropdownSupported(props.searchEntity);

        this.state = {
            text: props.defaultSearchText || "",
        } as IMainSearchBoxState;
    }

    /**
     * Render search box.
     */
    public render(): JSX.Element {
        let waterMark: string;
        if (this.props.searchEntity !== undefined) {
            waterMark = this.props.searchEntity === Models.SearchProvider.code
                ? Search_Resources.CodeSearchWatermark
                : Search_Resources.WorkItemSearchWatermark;
        }

        const { contextLabel } = this.props;
        return (
            <SearchBox
                contextLabel={contextLabel}
                onPerformSearch={this._performSearch}
                onChange={this._onChange}
                hasDropdown={this._isDropdownSupported}
                waterMarkText={waterMark}
                value={this.state.text}
                inputBoxRef={textBox => {this._textBox = textBox; }}
                dropDownContainerRef={dropdownContainer => { this._dropdownContainer = dropdownContainer; }} />
        );
    }

    /**
     * Fetch the dropdown control for the current search entity and append it to the dropdown container,
     * whenever MainSearchBox is rendered because of changes in SearchProvidersStore.
     * @param newProps
     */
    public componentWillReceiveProps(newProps: IMainSearchBoxProps): void {
        if (newProps.searchEntity !== this.props.searchEntity) {
            const inputElementCssSelector = ".search-BoxLarge--container .input-box";
            const searchEntity = newProps.searchEntity;

            if (this._dropdownControl) {
                this._dropdownControl.unbind($(this._textBox));
            }

            this._isDropdownSupported = isDropdownSupported(searchEntity);

            if (this._isDropdownSupported) {
                using(["Presentation/Scripts/TFS/TFS.Host.UI"], (tfsHostUI: typeof Tfs_Host_UI_NO_REQUIRE) => {
                    this.getDropdownAsync(
                        searchEntity,
                        inputElementCssSelector,
                        ((dropdown: Tfs_Host_UI_NO_REQUIRE.ISearchBoxDropdownControl) => {
                            this._dropdownControl = dropdown;
                            this._dropdownContainer.appendChild(dropdown.getPopup()[0]);
                            dropdown.bind($(this._textBox), true);
                        }));
                });
            }
        }

        if (newProps.defaultSearchText !== this.props.defaultSearchText) {
            this.setState({text: newProps.defaultSearchText || ""});
        }
    }

    /**
     * Method to instantiate search box dropdown asynchronously.
     * @param searchEntity
     * @param searchBoxSelector
     * @param callback
     */
    private getDropdownAsync(searchEntity: Models.SearchProvider, searchBoxSelector: string, callback: Function): void {
        if (searchEntity === Models.SearchProvider.code) {
            using(
                ["Search/Scripts/Providers/Code/TFS.Search.FilterDropdown"],
                (CodeSearchDropdown: typeof CodeSearchDropdown_NO_REQUIRE) => {
                    callback(new CodeSearchDropdown.SearchFilterDropdown({
                        onSetSearchBoxValue: Utils_Core.delegate(this, this.setSearchBoxValue)
                    }));
                });
        }
        else if (searchEntity === Models.SearchProvider.workItem) {
            using(
                ["Search/Scripts/Providers/WorkItem/Controls/TFS.Search.WorkItem.Controls.SearchBoxDropdown"],
                (WorkItemSearchDropdown: typeof WorkItemSearchDropdown_NO_REQUIRE) => {
                    callback(new WorkItemSearchDropdown.SearchBoxDropdown(
                        {
                            searchTextBoxCssSelector: searchBoxSelector,
                            documentClickNamespace: "MainSearchBoxDropdown",
                            isIdentityPickerEnabled: true,
                            dropdownId: "workitem-dropdown",
                            setSearchBoxValue: Utils_Core.delegate(this, this.setSearchBoxValue)
                        }));
                });
        }
    }

    @autobind
    private _onChange(value: string): void {
        this.setState({ text: value });
    }

    private setSearchBoxValue(searchText: string): void {
        this.setState({text: searchText});
    }

    @autobind
    private _performSearch(text: string, openInNewTab: boolean): void {
        // fetching text from the text box element as different dropdowns modify text box value by directly setting
        // value property of the textbox element, due to which onChange event on text box is not invoked thereby
        // causing state to remain unaltered.
        if (text) {
            using(["Search/Scripts/Common/TFS.Search.Helpers"], (Helpers: typeof Helpers_NO_REQUIRE) => {
                const legacySearchEntity = this.props.searchEntity === Models.SearchProvider.code
                    ? SearchConstants.CodeEntityTypeId
                    : SearchConstants.WorkItemEntityTypeId; // hard coding these values as they are meant to be removed when we are pure REACT.

                Helpers.Utils.createNewSearchRequestState(this.state.text, legacySearchEntity, openInNewTab);
            });
        }
    }
}

function isDropdownSupported(entityType: Models.SearchProvider) {
   return entityType === Models.SearchProvider.code || entityType === Models.SearchProvider.workItem;
}
