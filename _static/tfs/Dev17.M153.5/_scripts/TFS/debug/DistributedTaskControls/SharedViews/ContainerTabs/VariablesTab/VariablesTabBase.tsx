/// <reference types="react" />

import * as React from "react";

import { Item } from "DistributedTaskControls/Common/Item";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as ContainerTabBase from "DistributedTaskControls/SharedViews/ContainerTabs/ContainerTabBase";
import { VariablesTabSharedView } from "DistributedTaskControls/SharedViews/ContainerTabs/VariablesTab/VariablesTabSharedView";

export interface IVariablesTabBaseProps extends ContainerTabBase.IContainerTabBaseProps {
}

export interface IVariablesTabBaseState extends ContainerTabBase.IContainerTabBaseState {
}

export abstract class VariablesTabBase extends Base.Component<IVariablesTabBaseProps, IVariablesTabBaseState> {

    public render(): JSX.Element {
        return (
            <ContainerTabBase.ContainerTabBase {...this.props}>
                {this._getVariablesSharedView()}
            </ContainerTabBase.ContainerTabBase>
        );
    }

    private _getVariablesSharedView() {
        return (<VariablesTabSharedView
            leftFooter={this.getLeftFooter()}
            defaultItems={this.getDefaultItems()} />);
    }

    protected abstract getDefaultItems(): Item[];
    protected abstract getLeftFooter(): JSX.Element;
}