import * as React from "react";

import { Label } from "OfficeFabric/Label";
import { autobind, format, css } from "OfficeFabric/Utilities";

import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Integration/TemplatePicker/AsyncLabel";

export interface AsyncLabelProps {
    className: string;
    ariaLabelFormat: string;
    textPromise: IPromise<string>;
}

export interface AsyncLabelState {
    textValue: string;
    isResolved: boolean;
    isRejected: boolean;
}

export class AsyncLabel extends React.Component<AsyncLabelProps, AsyncLabelState> {
    
    constructor(props: AsyncLabelProps) {
        super(props);

        this.state = {
            textValue: null,
            isResolved: false,
            isRejected: false,
        }
    }

    public componentDidMount(): void {
        this.props.textPromise.then(
            (value: string) => {
                this.setState({
                    textValue: value,
                    isResolved: true,
                    isRejected: false,
                });
            },
            (error: Error) => {
                this.setState({
                    textValue: error.message,
                    isRejected: true,
                    isResolved: false,
                });
            }
        );
    }

    public render(): JSX.Element {
        let content: JSX.Element;

        if (this.state.isResolved) {
            content = <Label
                className={this.props.className}
                aria-label={format(this.props.ariaLabelFormat, this.state.textValue)}>
                {this.state.textValue}
            </Label>;
        } else if (this.state.isRejected) {
            content = <Label
                className={css(this.props.className, "async-label-error")}>
                {this.state.textValue}
            </Label>;
        } else {
            content = (
                <p
                    className={css(this.props.className, "loading")}
                    aria-label={WikiResources.AsyncLabelLoadingAriaLabel}>
                    <span>{" . "}</span>
                    <span>{" . "}</span>
                    <span>{" . "}</span>
                </p>
            );
        }

        return content;
    }
}
