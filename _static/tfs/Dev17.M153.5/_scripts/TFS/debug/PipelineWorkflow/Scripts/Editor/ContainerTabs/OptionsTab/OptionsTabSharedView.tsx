/// <reference types="react" />

import * as React from "react";

import { Item } from "DistributedTaskControls/Common/Item";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { TwoPanelSelectorComponent } from "DistributedTaskControls/Components/TwoPanelSelectorComponent";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import * as Utils_String from "VSS/Utils/String";

export interface IOptionsTabSharedViewProps extends Base.IProps {
    defaultItems: Item[];
}

export class OptionsTabSharedView extends Base.Component<IOptionsTabSharedViewProps, Base.IStateless> {

    public render(): JSX.Element {
        return (
            <div className={this.props.cssClass}>
                <TwoPanelSelectorComponent
                    cssClass="options-twopanel-selector"
                    items={this.props.defaultItems}
                    defaultItemKey={(!!this.props.defaultItems[0]) ? this.props.defaultItems[0].getKey() : Utils_String.empty}
                    leftPaneARIARegionRoleLabel={Resources.OptionsLeftPaneARIALabel}
                    rightPaneARIARegionRoleLabel={Resources.OptionsRightPaneARIALabel}
                    leftPaneInitialWidth={this._leftPanelInitialWidth}
                    setFocusOnLastSelectedItem={false} />
            </div> 
        );
    }

    private _leftPanelInitialWidth: string = "320px";
}
