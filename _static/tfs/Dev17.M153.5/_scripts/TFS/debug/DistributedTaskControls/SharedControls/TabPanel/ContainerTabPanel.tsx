/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreBase as Store } from "DistributedTaskControls/Common/Stores/Base";
import { ITabItemProps } from "DistributedTaskControls/Common/Types";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { IPivotItemProps, Pivot, PivotLinkFormat, PivotLinkSize, PivotItem } from "OfficeFabric/Pivot";
import { Icon } from "OfficeFabric/Icon";

import {localeFormat} from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedControls/TabPanel/ContainerTabPanel";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";

export interface IContainerTabPanelProps extends Base.IProps {
    tabItems: JSX.Element[];
    defaultTabKey: string;
    tabStoreList?: Store[];
    onTabClick?: (string) => void;
}

export interface IContainerTabPanelState extends Base.IState {
    selectedTabItemKey: string;
}

export class ContainerTabPanel extends Base.Component<IContainerTabPanelProps, IContainerTabPanelState> {

    public componentWillMount(): void {
        if (!!this.props.tabStoreList) {
            this.props.tabStoreList.forEach((tabStore: Store) => {
                tabStore.addChangedListener(this._onChange);
            });
        }

        this.setState({
            selectedTabItemKey: this.props.defaultTabKey
        });
    }

    public componentWillUnmount(): void {
        if (!!this.props.tabStoreList) {
            this.props.tabStoreList.forEach((tabStore: Store) => {
                tabStore.removeChangedListener(this._onChange);
            });
        }
    }

    public componentWillReceiveProps(nextProps: IContainerTabPanelProps) {
        if (nextProps.defaultTabKey !== this.state.selectedTabItemKey) {
            this.setState({
                selectedTabItemKey: nextProps.defaultTabKey
            });
        }
    }

    public render(): JSX.Element {
        return (<div className="dtc-workflow-pivot pivot-fabric-style-overrides">
            <Pivot linkFormat={PivotLinkFormat.links}
                linkSize={PivotLinkSize.normal}
                selectedKey={this.state.selectedTabItemKey}
                onLinkClick={this._onTabClick}>
                {this._getPivotItems()}
            </Pivot>
        </div>);
    }

    public _getPivotItems(): JSX.Element[] {
        return this.props.tabItems.map((tabItem: React.ReactElement<ITabItemProps>) => {
            let pivotItemLabel: string = tabItem.props.title;
            if (!!tabItem.props.icon) {
                pivotItemLabel = localeFormat(Resources.PivotError, pivotItemLabel);
            } 
            return (
                <PivotItem key={tabItem.key}
                    itemKey={tabItem.key as string}
                    ariaLabel={pivotItemLabel}
                    linkText={tabItem.props.title}
                    onRenderItemLink={(props: IPivotItemProps, defaultRenderer: (props?: IPivotItemProps) => JSX.Element) => {
                        return (<span>
                            {!!tabItem.props.icon && <Icon iconName="Error" className="dtc-pivot-item-icon" />}
                            {(!!tabItem.props.customRenderer) ?
                                tabItem.props.customRenderer(props, defaultRenderer) :
                                defaultRenderer(props)}
                        </span>);
                    }}>
                    <div className="dtc-pivot-item">
                        {tabItem}
                    </div>
                </PivotItem>
            );
        });
    }

    private _onChange = () => {
        this.setState(this.state);
    }

    private _onTabClick = (item: PivotItem) => {
        let key: string = item.props.itemKey;

        this.setState({
            selectedTabItemKey: key
        });

        if (this.props.onTabClick) {
            this.props.onTabClick(key);
        }
    }
}