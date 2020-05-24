/// <reference types="jquery" />
/// <reference types="react" />
/// <reference types="react-dom" />


import * as React from "react";
import * as Base from "DistributedTaskControls/Common/Components/Base";

import Controls = require("VSS/Controls");
import TabContentControl = require("VSS/Controls/TabContent");

export interface IProps extends Base.IProps, TabContentControl.ITabControlOption {
}

export class Component extends Base.Component<IProps, Base.IState> {
    private _tabControl: TabContentControl.TabControl;

    constructor(props: IProps) {
        super(props);
    }

    public render(): JSX.Element {
        let props: any = {
            "ref": (d: HTMLElement) => this.onRender(d)
        };

        return React.createElement("div", props);
    }

    protected onRender(element: HTMLElement) {
        if (this._tabControl) {
            this._tabControl.dispose();
        }

        this._tabControl = Controls.create(TabContentControl.TabControl, $(element), this.props);
    }
}
