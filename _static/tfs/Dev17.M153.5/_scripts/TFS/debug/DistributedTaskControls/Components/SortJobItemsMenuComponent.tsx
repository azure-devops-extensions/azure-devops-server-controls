/// <reference types="react" />
import * as React from "react";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { IJobSortOrder, JobSortType } from "DistributedTaskUI/Logs/Logs.Types";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { IVerticalTabItemProps } from "DistributedTaskUI/Logs/VerticalTab/VerticalTabItem.Types";

import { CommandBarButton, IButtonStyles } from "OfficeFabric/Button";
import { ContextualMenuItemType, IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";

export interface ISortJobItemsComponentProps extends ComponentBase.IProps {
    sortOrders: IJobSortOrder[];
    title: string;
    selectedSortOrder?: JobSortType;
    onSortOptionSelected: (selectedSortOrder: JobSortType) => void;
    tabItemProps?: IVerticalTabItemProps;
}

export class SortJobItemsMenuComponent extends ComponentBase.Component<ISortJobItemsComponentProps, ComponentBase.IStateless> {
    public render(): JSX.Element {
        return (
            <CommandBarButton
                className="sort-job-items-button"
                iconProps={{ iconName: "SortLines" }}
                text={this._getMenuBarText()}
                ariaLabel={Resources.SortJobItemsAriaTitle}
                styles={this._getMenuButtonStyles()}
                {...this.props.tabItemProps.ariaProps}
                menuProps={{
                    items: [
                        {
                            key: "section",
                            itemType: ContextualMenuItemType.Section,
                            sectionProps: {
                                title: this.props.title,
                                items: this._getSortOptions()
                            }
                        }
                    ]
                }}
                ariaDescription={Resources.SortJobItemsAriaTitle} />
        );
    }

    private _getSortOptions(): IContextualMenuItem[] {
        return this.props.sortOrders.map((sortOrder) => {
            return {
                name: sortOrder.displayName,
                key: sortOrder.sortType.toString(),
                onClick: this._onSortOptionSelected
            };
        });
    }

    private _getMenuBarText(): string {
        let selectedSortOrder: string = "";
        let sortOptions: IContextualMenuItem[] = this._getSortOptions();
        selectedSortOrder = !!this.props.selectedSortOrder ? this.props.selectedSortOrder.toString() : sortOptions[0].key;
        return this._getDisplayNameForMenuItem(selectedSortOrder, sortOptions);
    }

    private _getMenuButtonStyles(): IButtonStyles {
        let buttonStyles: IButtonStyles = {};
        let styles: string[] = ["root", "rootChecked", "rootHovered", "rootFocused", "rootPressed", "rootExpanded", "rootCheckedHovered", "rootCheckedPressed", "rootExpandedHovered"];
        for (let s in styles) {
            buttonStyles[styles[s]] = {
                backgroundColor: "transparent"
            };
        }
        return buttonStyles;
    }

    private _getDisplayNameForMenuItem(menuItemKey: string, menuItems: IContextualMenuItem[]) {
        let displayName: string = "";
        menuItems.some((menuItem: IContextualMenuItem) => {
            if (menuItem.key === menuItemKey) {
                displayName = menuItem.name;
                return true;
            }
        });
        return displayName;
    }

    private _onSortOptionSelected = (ev?: React.MouseEvent<HTMLElement>, item?: IContextualMenuItem) => {
        let selectedSortType: JobSortType = JobSortType.Unknown;
        try {
            selectedSortType = Number.parseInt(item.key);
        }
        catch { } //No-op
        this.props.onSortOptionSelected(selectedSortType);
        return true;
    }
}
