/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Item, ItemOverviewProps } from "DistributedTaskControls/Common/Item";
import { ITwoPanelOverviewProps, TwoPanelOverviewComponent } from "DistributedTaskControls/Components/TwoPanelOverviewComponent";

export interface IOptionsItemOverviewProps extends ItemOverviewProps {
    title: string;
}

export class OptionsOverview extends Base.Component<IOptionsItemOverviewProps, Base.IStateless> {

    public shouldComponentUpdate(): boolean {
        return false;
    }

    public render(): JSX.Element {
        let overviewProps = {
            title: this.props.title,
            view: null,
            item: this.props.item,
            instanceId: this.props.instanceId,
            overviewClassName: this.props.cssClass
        } as ITwoPanelOverviewProps;

        return (
            <div className="options-overview-container">
                <TwoPanelOverviewComponent {...overviewProps} />
            </div>
        );
    }
}
