import * as TFS_React from "Presentation/Scripts/TFS/TFS.React";

import * as Controls from "VSS/Controls";
import * as Navigation_Controls from "VSS/Controls/Navigation";
import * as Utils_Array from "VSS/Utils/Array";
import Menu_Controls_NO_REQUIRE = require("VSS/Controls/Menus");

// default behavior dropdown creates popup menu items
export interface IPivotFilterItem extends Navigation_Controls.IPivotFilterItem, Menu_Controls_NO_REQUIRE.IMenuItemSpec {
}

export interface Props extends TFS_React.IProps {
    name: string;
    title: string;
    behavior?: string;
    align?: string;
    hideFilter?: boolean;
    useBowtieStyle?: boolean;
    items?: IPivotFilterItem[];
    changedHandler?: (item: Navigation_Controls.IPivotFilterItem) => void;
}

export class Component extends TFS_React.TfsComponent<Props, TFS_React.IState> {
    private _pivotFilterControl: Navigation_Controls.PivotFilter;
    private _onStoresUpdated: () => void;

    constructor(props: Props) {
        super(props);
    }

    public shouldComponentUpdate(nextProps: Props, nextState: TFS_React.IState): boolean {
        return this.props.name !== nextProps.name
            || this.props.title !== nextProps.title
            || this.props.behavior !== nextProps.behavior
            || this.props.align !== nextProps.align
            || this.props.hideFilter !== nextProps.hideFilter
            || this.props.useBowtieStyle !== nextProps.useBowtieStyle
            || !Utils_Array.arrayEquals(this.props.items, nextProps.items, comparePivotFilterItems);
    }

    protected onRender(element: HTMLElement) {
        if (!this._pivotFilterControl) {
            this._pivotFilterControl = Controls.create(Navigation_Controls.PivotFilter, $(element), {
                behavior: this.props.behavior || "dropdown",
                text: this.props.title,
                align: this.props.align || "right-bottom",
                useBowtieStyle: !!this.props.useBowtieStyle,
                change: this.props.changedHandler,
                items: this.props.items
            });
        }

        if (this.props.items) {
            this._pivotFilterControl.updateItems(this.props.items);
        }

        if (this.props.hideFilter) {
            this._pivotFilterControl.hideElement();
        }
        else {
            this._pivotFilterControl.showElement();
        }
    }
}

function comparePivotFilterItems(left: Navigation_Controls.IPivotFilterItem, right: Navigation_Controls.IPivotFilterItem): boolean {
    return left.encoded === right.encoded
        && left.id === right.id
        && left.selected === right.selected
        && left.text === right.text
        && left.title === right.title
        && left.value === right.value;
}