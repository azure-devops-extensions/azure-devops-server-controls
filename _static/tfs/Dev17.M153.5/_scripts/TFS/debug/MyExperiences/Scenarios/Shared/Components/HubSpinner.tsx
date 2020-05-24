/// <reference types="react" />
/// <reference types="react-dom" />

import "VSS/LoaderPlugins/Css!MyExperiences/Scenarios/Shared/Components/HubSpinner";

import * as Spinner from "OfficeFabric/Spinner";
import * as React from "react";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";

import Utils_Core = require("VSS/Utils/Core");

export enum Alignment {
    left,
    center,
}

export interface Props {
    alignment?: Alignment;
    labelText?: string;
    delay?: number;
}

export interface State {
    show: boolean
}

export class HubSpinner extends React.Component<Props, State> {
    static defaultProps: Props = {
        alignment: Alignment.left,
        labelText: MyExperiencesResources.HubLoadingGeneric,
        delay: 1000
    };

    private _delayed: Utils_Core.DelayedFunction;

    public componentWillMount(): void {
        this._delayed = Utils_Core.delay(this, this.props.delay, () => {
            this.setState({
                show: true
            });
        });
    }

    public componentWillUnmount(): void {
        if (this._delayed) {
            this._delayed.cancel();
            this._delayed = null;
        }
    }

    public render(): JSX.Element {
        let visibilityClass = (!this.state || !this.state.show) ? "invisible" : "";
        let alignmentClass = `align-${Alignment[this.props.alignment]}`;
        let type = this.props.alignment == Alignment.left ? Spinner.SpinnerType.normal : Spinner.SpinnerType.large;
        return (
            <Spinner.Spinner
                className={`hub-spinner ${visibilityClass} ${alignmentClass}`}
                type={type}
                label={this.props.labelText}
                />
        );
    }
}
