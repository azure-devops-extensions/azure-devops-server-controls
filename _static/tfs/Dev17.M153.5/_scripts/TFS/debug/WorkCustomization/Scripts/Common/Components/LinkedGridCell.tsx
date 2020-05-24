/// <reference types="react" />

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!WorkCustomization/Common/Components/LinkedGridCell";

import * as React from "react";
import { css , IPoint} from "OfficeFabric/Utilities";
import { Component, Props, State } from "VSS/Flux/Component";
import { Link } from "OfficeFabric/Link";
import { PopupContextualMenu, IPopupContextualMenuProps } from "Presentation/Scripts/TFS/Components/PopupContextualMenu";
import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";
import { CommonUtils } from "WorkCustomization/Scripts/Utils/CommonUtils";
import * as Tooltip from "VSSUI/Tooltip";
import * as StringUtils from "VSS/Utils/String";
import * as Resources from "WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization";

export interface ILinkedGridCellProps extends Props {
    href: string;
    text: string;
    chevronButton?: JSX.Element;
    tag?: string;
    className?: string;
    contentClassName?: string;
    iconClassName?: string;
    iconTitle?: string;
    iconAriaLabel?: string;
    iconStyle?: React.CSSProperties;
    contextMenuItems?: IContextualMenuItem[];
    disabled?: boolean;
    showContextMenu?: boolean;
    target?: IPoint;
    turnOffFirstActive?: boolean;
}

export class LinkedGridCell extends Component<ILinkedGridCellProps, State>{
    render(): JSX.Element {
        let contextMenu: JSX.Element = null;
        if (this.props.contextMenuItems != null) {
            let contextMenuProps: IPopupContextualMenuProps = {
                className: "popup-menu",
                iconClassName: "bowtie-ellipsis",
                items: this.props.contextMenuItems,
                menuClassName: "processes-popup-menu",
                showContextMenu: this.props.showContextMenu,
                useTargetElement: !!this.props.target,
                target: this.props.target
            }
            contextMenu = <PopupContextualMenu {...contextMenuProps} />
        }

        const textContent: string = StringUtils.format(Resources.ProcessNameAndTagFormat, this.props.text, this.props.tag);

        return (
            <div className={css("linked-grid-cell", this.props.className)}>
                {this.props.chevronButton}
                <i className={css("cell-icon", this.props.iconClassName)} style={this.props.iconStyle} title={this.props.iconTitle} aria-label={this.props.iconAriaLabel} />
                <div className={css("cell-content", this.props.contentClassName)}>
                    {
                        this.props.disabled || !this.props.href ?
                            <Tooltip.TooltipHost content={textContent} overflowMode={Tooltip.TooltipOverflowMode.Self}>
                                <span className={"ms-font-m " + (this.props.turnOffFirstActive ? "" : "first-active")}>
                                    <span className="grid-cell-link">{textContent}</span>
                                </span>
                            </Tooltip.TooltipHost>
                            :
                            <Tooltip.TooltipHost content={textContent} overflowMode={Tooltip.TooltipOverflowMode.Parent}>
                                <Link className={"ms-font-m " + (this.props.turnOffFirstActive ? "" : "first-active")} href={this.props.href}>
                                    <span className="grid-cell-link">{textContent}</span>
                                </Link>
                            </Tooltip.TooltipHost>
                    }
                </div>
                {contextMenu}
            </div>
        );
    }
}