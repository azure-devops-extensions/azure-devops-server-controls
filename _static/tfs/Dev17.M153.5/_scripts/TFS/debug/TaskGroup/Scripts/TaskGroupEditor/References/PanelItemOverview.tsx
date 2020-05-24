import * as React from "react";

import { css } from "OfficeFabric/Utilities";

import { Component, IProps, IStateless } from "DistributedTaskControls/Common/Components/Base";
import { ITwoPanelOverviewProps, TwoPanelOverviewComponent } from "DistributedTaskControls/Components/TwoPanelOverviewComponent";
import { Item } from "DistributedTaskControls/Common/Item";

export interface IPanelItemProps extends IProps {
    title: string;
    item: Item;
    iconCss?: string;
}

export class PanelItemOverview extends Component<IPanelItemProps, IStateless>{
    public render(): JSX.Element {
        return (<TwoPanelOverviewComponent
            instanceId={this.props.instanceId}
            ariaDescription={this.props.title}
            canParticipateInMultiSelect={false}
            iconClassName={css("bowtie-icon", this.props.iconCss)}
            isDraggable={false}
            item={this.props.item}
            title={this.props.title}
            view={null}
            overviewClassName={this.props.cssClass}
        />);
    }
}