/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Component as ErrorMessageBar } from "DistributedTaskControls/Components/InformationBar";

import { ITabItemProps } from "DistributedTaskControls/Common/Types";

export interface IContainerTabBaseProps extends ITabItemProps {
    cssClass: string;
}

export interface IContainerTabBaseState extends Base.IState {
}

/**
 * @brief Base class for ContainerTab view
 */
export class ContainerTabBase extends Base.Component<IContainerTabBaseProps, IContainerTabBaseState> {

    /**
     * @brief Renders the view
     */
    public render(): JSX.Element {
        return (
            <div className={this.props.cssClass} >
                <ErrorMessageBar parentKey={this.props.tabKey} />
                {this.props.children}
            </div>
        );
    }
}