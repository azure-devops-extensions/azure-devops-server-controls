/// <reference types="react" />

import React = require("react");

import { BreadcrumbLink } from "Build/Scripts/Components/BreadcrumbLink";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";

import { ContextualMenu, IContextualMenuItem, DirectionalHint } from "OfficeFabric/ContextualMenu";
import { TooltipHost } from "VSSUI/Tooltip";

import { KeyboardAccesibleComponent } from "Presentation/Scripts/TFS/Components/KeyboardAccessible";

import { format } from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!Build/FolderBreadcrumb";

import {
    BaseComponent,
        anchorProperties,
        getNativeProps,
        css
} from 'OfficeFabric/Utilities';

import {
    Icon,
    IIconProps
} from 'OfficeFabric/Icon';


export interface IBreadcrumb {
    path: string;
    crumb: string;
}

export interface IBreadcrumbSeparatorProps {
    className?: string;
}

export const BreadcrumbSeparator = (props: IBreadcrumbSeparatorProps): JSX.Element => {
    return <div className={`build-folder-separator ${props.className}`}></div>;
}

export interface FolderBreadcrumbProps {
    className?: string;
    shouldLinkCurrentFolder: boolean;
    items: IBreadcrumb[];
    getBreadcrumbLink: (path: string) => string;
    onBreadcrumbClicked: (e: React.MouseEvent<HTMLElement>, path: string) => void;
}

export interface FolderBreadcrumbState {
    isContextMenuVisible: boolean;
}

export class FolderBreadcrumb extends React.Component<FolderBreadcrumbProps, FolderBreadcrumbState> {
    public refs: {
        [key: string]: React.ReactInstance;
        menuButton: HTMLElement;
    };

    constructor(props: FolderBreadcrumbProps) {
        super(props);

        this.state = {
            isContextMenuVisible: false
        };
    }

    private _renderBreadcrumbAnchor(item: IContextualMenuItem): React.ReactNode {
        let iconProps: IIconProps = item.iconProps ? item.iconProps : {
            iconName: 'CustomIcon',
            className: item.icon ? 'ms-Icon--' + item.icon : ''
        };
        let iconColorClassName = iconProps.iconName === 'None' ? '' : ('ms-ContextualMenu-iconColor ');
        let iconClassName = css('ms-ContextualMenu-icon icon', iconColorClassName, iconProps.className);
        return (
            <div>
                <a
                    { ...getNativeProps(item, anchorProperties) }
                    href={item.href}
                    className={css(
                        'ms-ContextualMenu-link breadcrumb-link',
                        (item.isDisabled || item.disabled) && 'is-disabled')}
                    style={item.style}
                    role="menuitem">
                    <div className="ms-ContextualMenu-linkContent breadcrumb-link-content">
                        <div>
                            <Icon { ...iconProps } className={css('ms-ContextualMenu-icon breadcrumb-link-icon bowtie-icon bowtie-folder', iconClassName)} />
                        </div>
                        <span className={css('ms-ContextualMenu-itemText breadcrumb-link-itemText')}>{item.name}</span>
                    </div>
                </a>
            </div>);
    }

    public render(): JSX.Element {
        if (this.props.items.length === 0) {
            return null;
        }

        let item = this.props.items[this.props.items.length - 1];
        let currentFolder: JSX.Element = null;
        let folderLabel = format(BuildResources.FolderAriaLabel, item.crumb);
        if (this.props.shouldLinkCurrentFolder) {
            currentFolder = <BreadcrumbLink iconClassName="bowtie-icon bowtie-folder folder-icon" path={item.path} linkText={item.crumb} title={folderLabel} getBreadcrumbLink={this.props.getBreadcrumbLink} onBreadcrumbClicked={this.props.onBreadcrumbClicked} />;
        }
        else {
            currentFolder = <TooltipHost content={folderLabel}>
                <span tabIndex={0}><span className="bowtie-icon bowtie-folder folder-icon" aria-label={folderLabel} />{item.crumb}</span>
            </TooltipHost>;
        }

        let menuButton: JSX.Element = null;
        let menu: JSX.Element = null;
        if (this.props.items.length > 1) {
            menuButton = <span>
                <BreadcrumbSeparator />
                <span ref="menuButton"><KeyboardAccesibleComponent ariaLabel={BuildResources.MoreFoldersMenuLabel} className="icon bowtie-icon bowtie-ellipsis folder-context-menu-trigger" onClick={this._onShowMenuClicked} /></span>
                <BreadcrumbSeparator />
            </span>;

            if (this.state.isContextMenuVisible) {
                let menuItems = this.props.items.slice(0, this.props.items.length - 1).map((breadcrumb) => {
                    return {
                        key: breadcrumb.path,
                        name: breadcrumb.crumb,
                        iconProps: { className: "bowtie-icon bowtie-folder" },
                        onClick: (event?: React.MouseEvent<HTMLElement>, item?: IContextualMenuItem) => this.props.onBreadcrumbClicked(event, breadcrumb.path),
                        href: this.props.getBreadcrumbLink(breadcrumb.path),
                        onRender: this._renderBreadcrumbAnchor,
                    } as IContextualMenuItem;
                });

                menu = <ContextualMenu items={menuItems} target={this.refs.menuButton} directionalHint={DirectionalHint.bottomLeftEdge} onDismiss={this._onDismissMenu} />;
            }
        }
        else {
            menu = <BreadcrumbSeparator />
        }

        let className = "folder-breadcrumb";
        if (this.props.className) {
            className += " " + this.props.className;
        }

        return <div className={className}>
            {menuButton}
            {menu}
            {currentFolder}
        </div>;
    }

    private _onShowMenuClicked = () => {
        this.setState({
            isContextMenuVisible: !this.state.isContextMenuVisible
        });
    };

    private _onDismissMenu = () => {
        this.setState({
            isContextMenuVisible: false
        });
    };
}

export function getBreadcrumbs(path: string): IBreadcrumb[] {
    if (!path) {
        return [];
    }

    let crumbs = ["\\"];
    let breadcrumbs: IBreadcrumb[] = [];

    if (path.trim() !== "") {
        crumbs = path.split("\\");
    }

    crumbs = crumbs.filter((crumb) => {
        return crumb.trim().length > 0;
    });

    let tempPath = "\\";

    crumbs.forEach((crumb) => {
        // append "\" to path before calculating next path
        if (tempPath.lastIndexOf("\\") !== tempPath.length - 1) {
            tempPath = tempPath + "\\";
        }

        tempPath = tempPath + crumb;
        breadcrumbs.push({
            crumb: crumb,
            path: tempPath + "\\"
        });
    });

    return breadcrumbs;
}
