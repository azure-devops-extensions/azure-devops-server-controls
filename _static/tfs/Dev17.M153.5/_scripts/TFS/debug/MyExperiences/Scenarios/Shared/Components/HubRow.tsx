/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";
import { IDetailsRowProps, DetailsRow } from "OfficeFabric/components/DetailsList/DetailsRow";
import { IHubItem } from  "MyExperiences/Scenarios/Shared/Models";

export interface IHubRowProps {
    rowProps: IDetailsRowProps;
}

export interface IHubRowState {
    isActive: boolean;
}

export class HubRow extends React.Component<IHubRowProps, IHubRowState> {
    constructor(props: IHubRowProps) {
        super(props);
        this.state = { isActive: false };
    }

    private setFocus() {
        this.setState({ isActive: true});
    }

    private setBlur() {
        this.setState({ isActive: false });
    }

    public render(): JSX.Element {
        let cssClass = this.state.isActive ? "is-active" : "not-active";

        let hubItem = this.props.rowProps.item as IHubItem;
        if (hubItem && hubItem.isDisabled && hubItem.isDisabled()) {
            cssClass += " is-disabled";
        }

        return (
            <div
                className={cssClass}
                onFocus={() => this.setFocus() }
                onBlur={() => this.setBlur() }
                onMouseLeave = {() => this.setBlur() }
                >
                <DetailsRow {...this.props.rowProps} onRenderCheck={ () => null } />
            </div>
        );
    }
}
