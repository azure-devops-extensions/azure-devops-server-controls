import * as React from "react";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { TooltipHost } from "VSSUI/Tooltip";
import { IContextualMenuItem, ContextualMenuItemType } from "OfficeFabric/ContextualMenu";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { CommandButton, IButtonProps } from 'OfficeFabric/Button';
import { PreviewSettingsPivotProps } from "Search/Scenarios/Shared/Components/PreviewSettingsPivot/PreviewSettingsPivot.Props";

import "VSS/LoaderPlugins/Css!Search/Scenarios/Shared/Components/PreviewSettingsPivot/PreviewSettingsPivot";

export function getPreviewSettingsPivotMenuItem(itemKey: string, props: PreviewSettingsPivotProps): IContextualMenuItem {
    return {
        name: itemKey,
        key: itemKey,
        className: "settings-pivot-button",
        onRender: (item: IContextualMenuItem) => {
            return <PreviewSettingsPivotButton {...props} />
        }
    };
}

export const PreviewSettingsPivotButton: React.StatelessComponent<PreviewSettingsPivotProps> = (props: PreviewSettingsPivotProps) => {
    if (!props.visible) {
        return null;
    }

    const headerItem: IContextualMenuItem = {
        itemType: ContextualMenuItemType.Header,
        name: Resources.PreviewOrientationLabel,
        key: 'PreviewPaneDropdownMenuHeader',
        className: 'previewpane-header-item'
    };
    const { currentSetting, items } = props;
    const onMenuItemClick = (ev: React.MouseEvent<HTMLElement>, { key, name }: IContextualMenuItem) => {
        props.onClick({ key, name });
    };
    const contextMenuItems: IContextualMenuItem[] = [headerItem, ...items.map(({ key, name }) => {
        return {
            key: key,
            name: name,
            onClick: onMenuItemClick,
            canCheck: true,
            checked: key === currentSetting
        } as IContextualMenuItem;
    })];

    const appliedItem = contextMenuItems.filter(ci => ci.checked);
    const tooltipContent = `${props.tooltipContent}: ${appliedItem[0].name}`;
    return (
        <span>
            <TooltipHost
                content={tooltipContent}
                directionalHint={DirectionalHint.topCenter}
                hostClassName="settings-pivot-tooltip">
                <CommandButton
                    iconProps={{ iconName: undefined, className: "bowtie-icon bowtie-details-pane" }}
                    text={Resources.View}
                    className="settings-pivot-button"
                    menuProps={{
                        shouldFocusOnMount: true,
                        directionalHint: DirectionalHint.bottomAutoEdge,
                        items: contextMenuItems
                    }}
                    menuIconProps={{ iconName: "ChevronDown" }} />
            </TooltipHost>
        </span>);
}
