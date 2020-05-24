import * as React from "react";
import * as ReactDOM from "react-dom";

import { IGroup } from "OfficeFabric/GroupedList";
import { SelectionMode } from "OfficeFabric/Selection";
import { Toggle } from "OfficeFabric/Toggle";
import { css, autobind, BaseComponent, IBaseProps } from "OfficeFabric/Utilities";
import * as ApiListComponent from "Presentation/Scripts/TFS/Samples/RestApiStatus/Components/ApiListComponent";
import { SimpleProviderComponent } from "Presentation/Scripts/TFS/Samples/RestApiStatus/Components/SimpleProviderComponent";
import * as ApiStore from "Presentation/Scripts/TFS/Samples/RestApiStatus/Store/ApiStore";
import { registerContent } from "VSS/SDK/Shim";

import { ContributableMenuItemProvider } from "VSSPreview/Providers/ContributableMenuItemProvider";
import { ContributablePivotBarActionProvider } from "VSSPreview/Providers/ContributablePivotBarActionProvider";
import { ContributablePivotItemProvider } from "VSSPreview/Providers/ContributablePivotItemProvider";
import { HistoryBehavior } from "VSSPreview/Utilities/ViewStateNavigation";
import { IVssHubViewState, VssHubViewState } from "VSSPreview/Utilities/VssHubViewState";
import { DropdownButton } from "VSSUI/ContextualMenuButton";
import { FilterBar } from "VSSUI/FilterBar";
import { KeywordFilterBarItem } from "VSSUI/TextFilterBarItem";
import { Hub } from "VSSUI/Hub";
import { IHubBreadcrumbItem, HubHeader } from "VSSUI/HubHeader";
import { IItemPickerProvider, PickListFilterBarItem } from "VSSUI/PickList";
import { PivotBarItem, IPivotBarAction } from "VSSUI/PivotBar";
import { IObservableArray, ObservableArray } from "VSS/Core/Observable";

import "VSS/LoaderPlugins/Css!Presentation/Samples/RestApiStatus/Views/MainView";

export interface IRestApiStatusState {
    apis: ApiStore.Api[];
}

export interface IRestApiStatusProps extends IBaseProps {
    className?: string;
    id?: string;
}

export class RestApiStatusView extends BaseComponent<IRestApiStatusProps, IRestApiStatusState> {
    private _httpMethods: ApiStore.HttpMethod[];
    private _hubViewState: IVssHubViewState;
    private _apiStoreChangedDelegate: { (): void };
    private _selectedApi: ApiStore.Api;
    private _store: ApiStore.ApiStore;

    private _pivotProvider: ContributablePivotItemProvider<any>;
    private _pivotContext = {
        property: "This is a property on the pivot item context object.",
        commandClicks: 0,
    };

    private _commandProvider: ContributablePivotBarActionProvider<any>;
    private _atTop = true;
    private _atBottom = false;
    private _viewActionProvider: ContributablePivotBarActionProvider<any>;
    private _actions: IObservableArray<IPivotBarAction>;

    constructor(props: IRestApiStatusProps) {
        super(props);

        this._hubViewState = new VssHubViewState({
            defaultPivot: "all",
            viewOptionNavigationParameters: [
                { key: "area", rawString: true, behavior: HistoryBehavior.newEntry },
                { key: "api", rawString: true, behavior: HistoryBehavior.newEntry }
            ]
        });

        this._store = new ApiStore.ApiStore(this._hubViewState.filter, this._hubViewState.viewOptions);

        this.state = {
            apis: this._store.apis.value,
        };

        this._store.apis.subscribe(this._apiStoreChanged);
    }

    private _getBreadcrumbItems(): IHubBreadcrumbItem[] {
        const breadcrumbs: IHubBreadcrumbItem[] = [
            {
                key: "all",
                text: "All APIs",
            },
        ];

        if (this._selectedApi || this._store.selectedGroup.value) {
            // Don't have an onclick for the root breadcrumb item if we're already on the root.
            breadcrumbs[0].onClick = () => {
                this._setSelection({});
            };
        }

        return breadcrumbs;
    }

    private _getRestApisPivotContents() {
        return (
            <div className={css(this.props.className)} id={this.props.id}>
                <ApiListComponent.ApiListComponent
                    apis={this.state.apis}
                    groups={this._store.getGroups(this.state.apis)}
                    onSetSelectedApi={this._setSelection}
                />
            </div>
        );
    }

    @autobind
    private _setSelection(selection: { area?: string; api?: string }) {
        this._hubViewState.viewOptions.setViewOptions(selection);
    }

    private _buildQueryParamsFromObject(obj: { [key: string]: string }) {
        let result = "";
        for (const key of Object.keys(obj)) {
            result += `&${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`;
        }
        if (result) {
            return "?" + result.substr(1);
        }
        return "";
    }

    @autobind
    private _getHeaderAreaItems() {
        return this._store.getGroups(this._store.allApis);
    }

    private _getHeaderItemPicker(): IItemPickerProvider<any> | null {
        if (this._store.selectedGroup.value && !this._selectedApi) {
            return {
                selectedItem: this._store.selectedGroup.value,
                getItems: this._getHeaderAreaItems,
                onSelectedItemChanged: selection => {
                    this._setSelection({ area: selection.name });
                },
                getListItem: _groupToHeaderItem,
            };
        } else {
            return null;
        }
    }

    public render(): JSX.Element {
        if (!this._pivotProvider) {
            this._pivotProvider = new ContributablePivotItemProvider(["ms.vss-tfs-web.api-status-sample-hub.pivotbar"], contribution => this._pivotContext);
        }

        if (!this._commandProvider) {
            this._commandProvider = new ContributablePivotBarActionProvider(["ms.vss-tfs-web.api-status-sample-hub.pivotbar.contributedActions.commands"], {
                property: "This is a property on the context object for the contributed commands.",
            });
        }

        if (!this._viewActionProvider) {
            this._viewActionProvider = new ContributablePivotBarActionProvider(["ms.vss-tfs-web.api-status-sample-hub.pivotbar.contributedActions.viewActions"], c => ({
                property: "This is a property on the context object for the contributed view actions.",
                atTop: this._atTop,
                atBottom: this._atBottom,
            }));
        }

        if (!this._actions) {
            this._actions = new ObservableArray<IPivotBarAction>();
        }

        const menuItemProvider = new ContributableMenuItemProvider(["ms.vss-tfs-web.api-status-sample-hub.pivotbar.contributedActions.menuItems"], c => ({
            property: "This is a property on the context object for the contributed menu items.",
            date: new Date(),
        }));

        return (
            <Hub
                pivotProviders={[this._pivotProvider]}
                hubViewState={this._hubViewState}>
                <HubHeader
                    breadcrumbItems={this._getBreadcrumbItems()}
                    iconProps={{ iconName: "Code" }}
                    headerItemPicker={this._getHeaderItemPicker()}
                />
                <FilterBar>
                    <KeywordFilterBarItem filterItemKey="keyword" />
                    <PickListFilterBarItem
                        filterItemKey="httpMethod"
                        selectionMode={SelectionMode.multiple}
                        getPickListItems={() => {
                            return this._httpMethods;
                        }}
                        placeholder="Operation"
                        showSelectAll={false}
                    />
                    <PickListFilterBarItem
                        filterItemKey="other"
                        selectionMode={SelectionMode.multiple}
                        getPickListItems={() => {
                            return [
                                "Reviewed",
                                "Not reviewed",
                                "Documented",
                                "Undocumented",
                                "Preview",
                                "Out of preview",
                            ] as ApiStore.ApiStatus[];
                        }}
                        placeholder="Other"
                        showSelectAll={false}
                    />
                </FilterBar>

                <PivotBarItem name="REST APIs" itemKey="all">
                    {this._getRestApisPivotContents()}
                </PivotBarItem>
            </Hub>
        );
    }

    public componentWillUnmount() {
        this._store.apis.unsubscribe(this._apiStoreChanged);
    }

    @autobind
    private _apiStoreChanged() {
        // Http methods are scoped to the selected group, but no other filter.
        const apis = this._store.selectedGroup.value
            ? this._store.allApis.filter(a => a.area === this._store.selectedGroup.value.name)
            : this._store.allApis;
        const httpMethods = {};
        apis.forEach(a => {
            httpMethods[a.httpMethod.toLowerCase()] = true;
        });
        this._httpMethods = Object.keys(httpMethods).map(
            m => m.substr(0, 1).toUpperCase() + m.substr(1),
        ) as ApiStore.HttpMethod[];

        this.setState({
            apis: this._store.apis.value,
        });
    }

    @autobind
    private _onCommandClick() {
        // need to create a new context object so that the code will know it has been updated and tell the contribution about it
        this._pivotContext = {
            ...this._pivotContext,
            commandClicks: this._pivotContext.commandClicks + 1,
        };
        if (this._pivotProvider) {
            this._pivotProvider.refresh();
        }
    }

    @autobind
    private _atTopChanged(value: boolean): void {
        this._atTop = value;
        this._updateContributedViewActions();
    }

    @autobind
    private _atBottomChanged(value: boolean): void {
        this._atBottom = value;
        this._updateContributedViewActions();
    }

    private _updateContributedViewActions(): void {
        if (this._viewActionProvider) {
            this._viewActionProvider.refresh();
        }
    }
}

function _groupToHeaderItem(item: IGroup) {
    return {
        name: item.name,
        key: item.key,
    };
}

registerContent("hub.sample-api-status", context => {
    ReactDOM.render(<RestApiStatusView className="rest-api-status-sample" />, context.$container[0]);
});

