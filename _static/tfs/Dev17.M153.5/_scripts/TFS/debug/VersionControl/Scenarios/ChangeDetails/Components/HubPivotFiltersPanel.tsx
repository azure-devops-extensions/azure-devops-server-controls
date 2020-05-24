import * as React from "react";

import * as Controls from "VSS/Controls";
import { MenuBar, IMenuItemSpec } from "VSS/Controls/Menus";

import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";
import { IChangeDetailsPropsBase } from "VersionControl/Scenarios/ChangeDetails/IChangeDetailsPropsBase";

import "VSS/LoaderPlugins/Css!VersionControl/HubPivotFiltersPanel";

export interface IHubPivotFiltersPanelProps extends IChangeDetailsPropsBase {
    isFullScreenVisible: boolean;
    isFullScreen: boolean;
    isCloneButtonVisible: boolean;
    isDiffViewerToolBarVisible: boolean;
    isFileViewerToolBarVisible: boolean;
    fullScreenModeChangedCallback(customerIntelligenceData?: CustomerIntelligenceData): void;
    createClonePopUpCallback(element: JQuery): void;
}

/**
 *  Panel for components present in the Hub Pivot Filters i.e, fullscreen, diffview settings, history filters.
 */
export class HubPivotFiltersPanel extends React.Component<IHubPivotFiltersPanelProps, {}> {

    public render(): JSX.Element {
        const menuItems: IMenuItemSpec[] = [];

        if (this.props.isFullScreenVisible) {
            menuItems.push({
                id: "full-screen",
                cssClass: "icon-only",
                title: this.props.isFullScreen ? VCResources.ExitFullScreenMode : VCResources.EnterFullScreenModeTooltip,
                icon: this.props.isFullScreen ? "bowtie-icon bowtie-view-full-screen-exit" : "bowtie-icon bowtie-view-full-screen",
                showText: false,
                action: this.fullScreenModeChanged,
            } as IMenuItemSpec);
        }

        return (
            <div className="vc-changedetails-filters">
                <span className="diffviewer-toolbar vc-changelist-diffviewer-toolbar toolbar" style={convertToDisplayStyle(this.props.isDiffViewerToolBarVisible)}></span>
                <span className="fileviewer-toolbar pr-fileviewer-toolbar toolbar" style={convertToDisplayStyle(this.props.isFileViewerToolBarVisible)}></span>
                <ChangeDetailsToolBar menuItems={menuItems} />
            </div>
        );
    }

    private fullScreenModeChanged = (): void => {
        this.props.fullScreenModeChangedCallback(this.props.customerIntelligenceData ? this.props.customerIntelligenceData.clone() : null);
    }
}

function convertToDisplayStyle(isVisible: boolean): React.CSSProperties {
    return { display: isVisible ? "inherit" : "none" };
}

interface ChangeDetailsToolBarProps extends React.Props<{}> {
    menuItems: IMenuItemSpec[];
}

class ChangeDetailsToolBar extends React.Component<ChangeDetailsToolBarProps, {}> {
    private _actionsMenu: MenuBar;

    public render(): JSX.Element {
        return (
            <span className="change-details-tool-bar menuitems-toolbar toolbar"></span>
        );
    }

    public componentDidMount(): void {
        this._actionsMenu = Controls.BaseControl.createIn(MenuBar, $(".change-details-tool-bar"), {
            items: this.props.menuItems,
        }) as MenuBar;
    }

    public componentDidUpdate(): void {
        this._actionsMenu.updateItems(this.props.menuItems);
    }
}