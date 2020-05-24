import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!Admin/Scripts/Components/IconPicker";

import * as React from "react";
import { Component, State, Props } from "VSS/Flux/Component";
import { DefaultButton, IButtonProps, IButton } from "OfficeFabric/Button";
import { ContextualMenu, IContextualMenu, IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { FocusZoneDirection } from "OfficeFabric/FocusZone";
import { autobind } from "OfficeFabric/Utilities";
import { WorkItemTypeIconComponent } from "Admin/Scripts/Components/WorkItemTypeIconComponent";
import { IconUtils } from "Admin/Scripts/Common/IconUtils";
import { TooltipHost } from "VSSUI/Tooltip";
import { KeyCode } from "VSS/Utils/UI";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import * as Utils_String from "VSS/Utils/String";
import * as Resources from "Admin/Scripts/Resources/TFS.Resources.Admin";

export interface IIconPickerProps extends Props {
    /** Name of the selected icon */
    selectedIcon: string;
    /** Dictionary of icon name to icon css class */
    icons: IDictionaryStringTo<string>;
    /** Event fired when an icon is selected */
    onChanged: (icon: string) => void;

    disabled?: boolean;
}

export class IconPicker extends Component<IIconPickerProps, State> {
    protected _iconPickerMenu: ContextualMenu;
    private _firstIconSelection: IButton;

    public render(): JSX.Element {
        return <div className={"icon-picker-container"}>
            <TooltipHost
                hostClassName="icon-picker-button-tooltip-host"
                content={Utils_String.localeFormat(Resources.SelectedWorkItemTypeIconTooltip, this.props.selectedIcon)}>
                <DefaultButton
                    onRenderText={this._getSelectedIconText}
                    ariaLabel={this.props.selectedIcon}
                    onKeyDown={this._onKeyDown}
                    menuProps={{
                        items: this._getContextMenuItems(),
                        className: "icon-contextualMenu",
                        isBeakVisible: false,
                        shouldFocusOnMount: false, // when true it gives focus to the first item in the menu
                        arrowDirection: FocusZoneDirection.bidirectional,
                        componentRef: ((contextualMenu: ContextualMenu) => this._iconPickerMenu = contextualMenu)
                    }}
                    disabled={this.props.disabled}/>
            </TooltipHost>
        </div>;
    }

    @autobind
    private _getSelectedIconText(props: IButtonProps): JSX.Element {
        return <div key={this.props.selectedIcon} className="selected-icon">
            <WorkItemTypeIconComponent icon={this.props.selectedIcon} />
        </div>;
    }

    @autobind
    private _onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
        if (!this._firstIconSelection || event.ctrlKey || event.altKey || event.shiftKey) {
            return;
        }

        switch (event.keyCode) {
            case KeyCode.UP:
            case KeyCode.DOWN:
            case KeyCode.LEFT:
            case KeyCode.RIGHT:
                this._firstIconSelection.focus();
                break;
        }
    }

    private _getContextMenuItems(): IContextualMenuItem[] {
        const menuItems: IContextualMenuItem[] = [];
        const iconNames = Object.keys(this.props.icons);
        for (const iconName of iconNames) {
            menuItems.push({
                key: iconName,
                name: this.props.icons[iconName],
                onRender: this._renderIconButton,
                className: "icon-contextualMenu-item",
                isFirstIcon: iconName === iconNames[0]
            });
        }

        return menuItems;
    }

    @autobind
    private _renderIconButton(item: IContextualMenuItem) {
        const isSelectedIcon = item.key === this.props.selectedIcon;
        const iconButtonClassName = "icon-button";
        const selectedIconClassName = "selected-icon";

        return (
            <TooltipHost
                hostClassName="icon-button-tooltip-host"
                directionalHint={DirectionalHint.bottomCenter}
                // buttons inside a context menu need a key
                key={item.key}
                content={item.key}>
                <DefaultButton
                    className={isSelectedIcon ? `${iconButtonClassName} ${selectedIconClassName}` : iconButtonClassName}
                    ariaLabel={item.key}
                    onClick={this._onIconChanged.bind(this, item)}
                    componentRef={(button: IButton) => { if (item.isFirstIcon) { this._firstIconSelection = button; } }}>
                    <WorkItemTypeIconComponent icon={item.key} />
                </DefaultButton>
            </TooltipHost>
        );
    }

    @autobind
    private _onIconChanged(item: IContextualMenuItem, ev?: React.MouseEvent<HTMLButtonElement>): void {
        this._iconPickerMenu.dismiss(ev, true);

        if (this.props.onChanged) {
            this.props.onChanged(item.key);
        }
    }
}
