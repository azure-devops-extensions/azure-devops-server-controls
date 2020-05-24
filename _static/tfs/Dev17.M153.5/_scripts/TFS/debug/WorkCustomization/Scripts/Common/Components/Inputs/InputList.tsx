/// <reference types="react" />
/// <reference types="react-dom" />

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!WorkCustomization/Common/Components/Inputs/InputList";
import * as React from "react";
import { Component, Props, State } from "VSS/Flux/Component";
import { autobind, css } from "OfficeFabric/Utilities";
import { List } from "OfficeFabric/List";
import { PrimaryButton, CommandButton } from "OfficeFabric/Button";

export interface IInputListProps {
    items: any[],
    disableAdd: boolean,
    onRenderItem: (item?: any, index?: number) => JSX.Element,
    onAddItemClicked: () => void,
    addButtonText: string,
    buttonCssClass?: string
}

export class InputList extends React.Component<IInputListProps, State>{
    public render(): JSX.Element {

        return <div className={"input-list"}>
            <div className={"list-container"}>
                <List
                    items={this.props.items}
                    onRenderCell={this.props.onRenderItem} />
            </div>
            <div className={"add-button-container"}>
                <CommandButton disabled={this.props.disableAdd}
                    iconProps={{ className: "bowtie-icon bowtie-math-plus-light" }}
                    onClick={this.props.onAddItemClicked}
                    className={this.props.buttonCssClass} >
                    {this.props.addButtonText}
                </CommandButton>
            </div>
        </div>;
    }
}