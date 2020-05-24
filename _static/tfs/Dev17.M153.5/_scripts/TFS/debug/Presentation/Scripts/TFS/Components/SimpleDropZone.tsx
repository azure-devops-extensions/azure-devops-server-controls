/// <amd-dependency path="jQueryUI/droppable"/>

import * as $ from "jquery";
import * as React from "react";
import { autobind, getNativeProps, divProperties } from "OfficeFabric/Utilities";

export interface ISimpleDropZoneProps extends React.HTMLAttributes<HTMLDivElement> { 
    droppableOptions: JQueryUI.DroppableOptions;
}

export class SimpleDropZone extends React.Component<ISimpleDropZoneProps> {
    private _root: HTMLDivElement;

    public render(): JSX.Element {
        const divProps = getNativeProps(this.props, divProperties);

        return (
            <div ref={this._resolveRootRef} key="drop-zone" {...divProps}>
                {this.props.children}
            </div>
        );
    }

    public componentDidMount(): void {
        if (this._root) {
            const $root = $(this._root);
            if ($root) {
                $root.droppable(this.props.droppableOptions);
            }
        }
    }

    public componentWillUnmount(): void {
        if (this._root) {
            const $root = $(this._root);
            if ($root && $root.hasClass("ui-droppable")) {
                $root.droppable("destroy");
            }
        }
    }

    @autobind
    private _resolveRootRef(element: HTMLDivElement): void {
        this._root = element;
    }
}