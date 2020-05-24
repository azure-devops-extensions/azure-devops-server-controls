import * as React from "react";

import { DefinitionContextualMenuitemsActionHub } from "Build/Scripts/Actions/DefinitionContextualMenuItems";
import { DefinitionPopupContextualMenus } from "Build/Scripts/Sources/DefinitionPopupContextualMenus";

import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";

import { IContributionData } from "VSSPreview/Flux/Components/ContributableContextMenu";

import { PopupContextualMenu, IPopupContextualMenuProps } from "Presentation/Scripts/TFS/Components/PopupContextualMenu";

import { BuildDefinitionReference } from "TFS/Build/Contracts";

import { getCollectionService } from "VSS/Service";

export interface IDefinitionPopupContextualMenuProps {
    definition: BuildDefinitionReference;
    iconClassName: string;
    getMenuItems: () => IContextualMenuItem[];
    className: string;
    menuClassName: string;
    contributionData: IContributionData;
}

export interface IDefinitionPopupContextualMenuState {
    items: IContextualMenuItem[];
    asyncItems: IContextualMenuItem[];
}

export class DefinitionPopupContextualMenu extends React.Component<IDefinitionPopupContextualMenuProps, IDefinitionPopupContextualMenuState> {
    constructor(props: IDefinitionPopupContextualMenuProps) {
        super(props);
        this.state = {
            items: [],
            asyncItems: []
        };

        this._actionHub = new DefinitionContextualMenuitemsActionHub();
        this._source = getCollectionService(DefinitionPopupContextualMenus);
    }

    public render(): JSX.Element {
        const props: IPopupContextualMenuProps = {
            className: this.props.className,
            contributionData: this.props.contributionData,
            iconClassName: this.props.iconClassName,
            menuClassName: this.props.menuClassName,
            items: this._getAllMenuItems(),
            onClick: this._onClick,
            useTargetElement: true
        };

        return <PopupContextualMenu {...props} />;
    }

    public componentWillReceiveProps(nextProps: IDefinitionPopupContextualMenuProps) {
        this._updateItems(nextProps.getMenuItems());
    }

    public componentDidMount() {
        this._isMounted = true;
        this._actionHub.itemsAdded.addListener(this._updateAsyncItems);
        this._updateItems(this.props.getMenuItems());
    }

    public componentWillUnmount() {
        this._isMounted = false;
        this._actionHub.itemsAdded.removeListener(this._updateAsyncItems);
    }

    private _getAllMenuItems() {
        let items: IContextualMenuItem[] = [];
        items = items.concat(this.state.items);
        items = items.concat(this.state.asyncItems);
        return items;
    }

    private _onClick = () => {
        // lazy fetch, there is absolutely no need to get these items, if the menu was never clicked, it might be costly to get these items on page load/when component is mounted
        this._source.fetchAsyncItems(this.props.definition, this._actionHub);
    }

    private _updateItems = (items: IContextualMenuItem[]) => {
        this._isMounted && this.setState({
            items: items
        });
    }

    private _updateAsyncItems = (items: IContextualMenuItem[]) => {
        this._isMounted && this.setState({
            items: this.state.items,
            asyncItems: items
        });
    }

    private _actionHub: DefinitionContextualMenuitemsActionHub;
    private _source: DefinitionPopupContextualMenus = null;
    private _isMounted: boolean = false;
}