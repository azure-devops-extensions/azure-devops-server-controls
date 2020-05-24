import React = require("react");

import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";

import * as Contributions from "Presentation/Scripts/TFS/Components/Contribution";
import * as PivotFilter from "Presentation/Scripts/TFS/Components/PivotFilter";
import * as PivotTabs from "Presentation/Scripts/TFS/Components/PivotTabs";
import { ContributionComponent } from "Presentation/Scripts/TFS/Router/ContributionComponent";

import { Action } from "VSS/Flux/Action";
import * as Store from "VSS/Flux/Store";

import { getDefaultWebContext } from "VSS/Context";
import { urlHelper } from "VSS/Locations";
import * as Navigation_Services from "VSS/Navigation/Services";
import * as Utils_Array from "VSS/Utils/Array";
import { Debug } from "VSS/Diag";
import "VSS/LoaderPlugins/Css!Presentation/Components/PivotView";
import { autobind } from "OfficeFabric/Utilities";

export interface PivotViewItem extends PivotTabs.PivotTabItem {
    contribution?: Contribution;
    uri?: string;
    onClick?: (ev: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
}

export interface ContributionTabProps {
    tabKey: string;
}

class ContributionTabComponent extends Contributions.Component<ContributionTabProps> {
}

class ContributionReactTabComponent extends ContributionComponent<ContributionTabProps> {
}

export interface Props {
    className?: string;
    /**
     * Sets initial pivot view items
     */
    items: PivotViewItem[];

    /**
     * Specifies actions to update the pivot view items and data after component is initially rendered.
     */
    actions?: ActionsHub;

    /**
     * Sets default selected pivot view item.
     */
    selectedTabKey?: string;

    /**
     * Sets to true to use react component for contributions
     */
    useContributionComponent?: boolean;

    /**
     * Commands to show on pivot.
     */
    commandBarItems?: IContextualMenuItem[];
}

export interface State {
    selectedTabKey: string;
    filters: PivotFilter.Props[];
    dataElement?: JSX.Element;
}

export class Component extends React.Component<Props, State> {
    private _pivotItems: PivotItemStore;
    private _pivotDataElements: PivotDataElementStore;

    constructor(props: Props) {
        super(props);

        const actions = this.props.actions || new ActionsHub();
        this._pivotItems = new PivotItemStore(actions);
        this._pivotDataElements = new PivotDataElementStore(actions);

        // first try props, then state's action, then fall back to the first tab
        const tabKey = this.props.selectedTabKey
            || Navigation_Services.getHistoryService().getCurrentState().action
            || (this.props.items.length > 0 ? this.props.items[0].tabKey : "");
        this.state = this._getState(tabKey);
    }

    public render(): JSX.Element {
        let selectedItem: PivotViewItem = Utils_Array.first(this.props.items, (item: PivotViewItem) => {
            return item.tabKey === this.state.selectedTabKey;
        });

        if (!selectedItem) {
            selectedItem = this.props.items[0];
        }

        let content: JSX.Element = null;
        if (selectedItem && selectedItem.contribution) {
            let tabProps: ContributionTabProps = {
                tabKey: selectedItem.tabKey
            };

            // If useContributionComponent is true it renders the Contribution React tab component as the "ContributionTabComponent" breaks the react chain
            // will make passing context impossible
            if (this.props.useContributionComponent) {
                content = <ContributionReactTabComponent key={selectedItem.contribution.id} contribution={selectedItem.contribution} initialConfig={tabProps} />;
            }
            else {
                content = <ContributionTabComponent contribution={selectedItem.contribution} initialConfig={tabProps} />;
            }
        }

        let filters: JSX.Element = null;
        if (this.state.filters && this.state.filters.length > 0) {
            filters = <div className="pivot-view-component filters">
                <div className="filter-area">
                    {
                        this.state.filters.map((filter) =>
                            <div className="filter" key={filter.key}>
                                <PivotFilter.Component { ...filter } />
                            </div>
                        )
                    }
                </div>
            </div>;
        }

        const selectedTabId = selectedItem ? PivotTabs.getTabHeaderId(selectedItem.tabKey) : null;

        return <div className={this.props.className}>
            <div className="hub-pivot">
                <PivotTabs.PivotTabs
                    items={this.props.items}
                    commandBarItems={this.props.commandBarItems}
                    selectedKey={selectedItem && selectedItem.tabKey}
                    getLink={this._getLink}
                    getClickHandler={this._getClickHandler} />
                <div className="pivot-view-component data">
                    {this.state.dataElement}
                </div>
                {filters}
            </div>
            <div className="hub-pivot-content" role="tabpanel" id="pivotview-tabpanel" aria-labelledby={selectedTabId}>
                {content}
            </div>
        </div>;
    }

    public componentDidMount(): void {
        this._pivotItems.initialize();
        this._pivotDataElements.initialize();

        Navigation_Services.getHistoryService().attachNavigate(this._onNavigate);
        this._pivotItems.addChangedListener(this._onStoresUpdated);
        this._pivotDataElements.addChangedListener(this._onStoresUpdated);
    }

    public componentWillUnmount(): void {
        Navigation_Services.getHistoryService().detachNavigate(this._onNavigate);
        this._pivotItems.removeChangedListener(this._onStoresUpdated);
        this._pivotDataElements.removeChangedListener(this._onStoresUpdated);

        this._pivotItems.dispose();
        this._pivotDataElements.dispose();
    }
    private _onNavigate = (target: Navigation_Services.HistoryService, state: any) => {
        let tabkey = state.action;
        if (this.props.items.some(item => item.tabKey === tabkey)) {
            // Continue processing the on navigate event if the target action can be found from the props items
            // This is to prevent pivot view to react when page tries to navigate outside of the current hub
            this.setState(this._getState(tabkey));
        }
    };

    @autobind
    private _onStoresUpdated() {
        this.setState(this._getState(this.state.selectedTabKey));
    };

    private _getState(tabKey: string): State {
        return {
            selectedTabKey: tabKey,
            filters: this._pivotItems.getPivotItems(tabKey),
            dataElement: this._pivotDataElements.getPivotDataElement(tabKey)
        };
    }

    @autobind
    private _getLink(key: string): string  {
        let item = Utils_Array.first(this.props.items, (item) => item.tabKey === key);
        Debug.assertIsNotNull(item, "Item is not available for key: " + key);

        if (item.uri) {
            return item.uri;
        }

        let historyService = Navigation_Services.getHistoryService();
        let action = item.contribution.properties["action"] || "contribution";
        let nextState = historyService.getCurrentState();

        let uri = historyService.getFragmentActionLink(action, nextState);

        if (item.contribution.properties.target) {
            uri = urlHelper.getMvcUrl({
                webContext: getDefaultWebContext(),
                controller: item.contribution.properties.target.controller,
                action: item.contribution.properties.target.action
            });
        }

        return uri;
    }

    @autobind
    private _getClickHandler(key: string): (ev: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void {
        let item = Utils_Array.first(this.props.items, (item) => item.tabKey === key);
        Debug.assertIsNotNull(item, "Item is not available for key: " + key);
        return item.onClick;
    }
}

export interface UpdatePivotItemsPayload {
    tabKey: string;
    items: PivotFilter.Props[];
}

export interface UpdatePivotDataElementPayload {
    tabKey: string;
    element: JSX.Element;
}

export class ActionsHub {
    public UpdatePivotItems = new Action<UpdatePivotItemsPayload>();
    public UpdatePivotDataElement = new Action<UpdatePivotDataElementPayload>();
}

class PivotItemStore extends Store.Store {
    private _tabKeysToPivotItems: IDictionaryStringTo<PivotFilter.Props[]> = {};
    private _actions: ActionsHub;
    private _initialized: boolean = false;

    constructor(actions: ActionsHub) {
        super();

        this._actions = actions;

        this.initialize();
    }

    public initialize(): void {
        if (this._actions && !this._initialized) {
            this._actions.UpdatePivotItems.addListener(this._onUpdatePivotItems);
            this._initialized = true;
        }
    }

    public getPivotItems(tabKey: string): PivotFilter.Props[] {
        if (!tabKey || tabKey.length === 0) {
            return [];
        }

        return this._tabKeysToPivotItems[tabKey] || [];
    }

    public dispose(): void {
        if (this._actions && this._initialized) {
            this._actions.UpdatePivotItems.removeListener(this._onUpdatePivotItems);
            this._initialized = false;
        }
    }

    private _onUpdatePivotItems = (payload: UpdatePivotItemsPayload) => {
        if (payload.tabKey && payload.tabKey.length > 0) {
            this._tabKeysToPivotItems[payload.tabKey] = payload.items;

            this.emitChanged();
        }
    };
}

class PivotDataElementStore extends Store.Store {
    private _tabKeysToPivotDataElement: IDictionaryStringTo<JSX.Element> = {};
    private _actions: ActionsHub;
    private _initialized: boolean = false;

    constructor(actions: ActionsHub) {
        super();

        this._actions = actions;

        this.initialize();
    }

    public initialize(): void {
        if (this._actions && !this._initialized) {
            this._actions.UpdatePivotDataElement.addListener(this._onUpdatePivotDataElement);
            this._initialized = true;
        }
    }

    public getPivotDataElement(tabKey: string): JSX.Element {
        if (!tabKey || tabKey.length === 0) {
            return null;
        }

        return this._tabKeysToPivotDataElement[tabKey] || null;
    }

    public dispose(): void {
        if (this._actions && this._initialized) {
            this._actions.UpdatePivotDataElement.removeListener(this._onUpdatePivotDataElement);
            this._initialized = false;
        }
    }

    private _onUpdatePivotDataElement = (payload: UpdatePivotDataElementPayload) => {
        if (payload.tabKey && payload.tabKey.length > 0) {
            this._tabKeysToPivotDataElement[payload.tabKey] = payload.element;

            this.emitChanged();
        }
    };
}