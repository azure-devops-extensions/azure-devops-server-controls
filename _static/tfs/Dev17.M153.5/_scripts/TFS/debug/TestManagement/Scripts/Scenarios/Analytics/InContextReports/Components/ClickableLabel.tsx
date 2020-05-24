/// <reference types="react" />
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Analytics/InContextReports/Components/ClickableLabel";

import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { css, autobind } from "OfficeFabric/Utilities";
import * as React from "react";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as ComponentBase from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";


export interface IClickableLabelProps extends ComponentBase.Props {
    value: string;
    onClick?: () => void;
    showLoadingOnClick?: boolean;
}

export interface IClickableLabelState extends ComponentBase.State {
    isLoading?: boolean;
}

/*
* This class renders a text populated span which on hover is underlined
* Property onClick must be set for appropriate hover css to render
*/
export class ClickableLabel extends ComponentBase.Component<IClickableLabelProps, IClickableLabelState> {
    constructor(props) {
        super(props);
        this.state = { isLoading: false } as IClickableLabelState;
    }

    public static getDerivedStateFromProps(nextProps: IClickableLabelProps, prevState: IClickableLabelState): IClickableLabelState | null {
        if (nextProps && !nextProps.showLoadingOnClick) {
            return { isLoading: false } as IClickableLabelState;
        }
        return null;
    }

    public render(): JSX.Element {
        let className: string = css(this.props.cssClass, this.props.onClick ? "clickable-label-text-hoverable-link" : Utils_String.empty, this.props.showLoadingOnClick ? "clickable-label-loading-message" : Utils_String.empty);
        if (this.state.isLoading) {
            return (<div className={className}>
                        <Spinner className="clickable-lable-loading-spinner" size={SpinnerSize.small} />
                        <span>{Resources.LoadingMessage}</span>
                    </div>);
        }
        else {
            let ariaLabel: string = this.props.value ? Utils_String.format("{0} {1} ", this.props.value, Resources.LinkText) : "";
            return (<span
                        className={className}
                        onClick={this._onClick}
                        aria-label={ariaLabel}
                    >
                        {this.props.value}
                    </span>);            
        }
    }

    @autobind
    private _onClick (): void {
        if (this.props.showLoadingOnClick) {
            this.setState({ isLoading: true });
        }

        if (this.props.onClick) {
            this.props.onClick();
        }
    }
}