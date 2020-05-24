/// <reference types="react" />

import * as React from "react";
import * as Base from "DistributedTaskControls/Common/Components/Base";

import { Icon } from "OfficeFabric/Icon";
import * as stylesImport from "OfficeFabric/components/TextField/TextField.scss";
import { Async, css } from "OfficeFabric/Utilities";

import { equals, empty } from "VSS/Utils/String";
import "VSS/LoaderPlugins/Css!fabric";

export interface IProps extends Base.IProps {
    value: string;
    onGetErrorMessage: () => string | PromiseLike<string>;
    /** This won't triggered during mounting, only further validations are captured */
    onNotifyValidationResult?: (errorMessage: string, value: string) => void;
}

export interface IRequiredIndicatorState extends Base.IState {
    errorMessage?: string;
}

export class Component extends Base.Component<IProps, IRequiredIndicatorState> {
    constructor(props: IProps) {
        super(props);

        this._lastValidation = 0;

        this.state = {
            errorMessage: ""
        };

        this._delayedSetErrorMessage = (new Async()).debounce(this._setErrorMessage, Component.__validationDelayMs);
    }

    public render() {
        let className = "required-indicator";
        const errorMessage = this.state.errorMessage;
        let errorMessageNode: JSX.Element = null;
        if (errorMessage) {
            className += " " + "required-value-missing";
            // TODO: Remove 'ms-u-slideDownIn20' once RM on production is M120
            errorMessageNode = <p className={css("ms-TextField-errorMessage ms-u-slideDownIn20 ms-slideDownIn20 required-indicator-error-message", this.props.cssClass, stylesImport.errorMessage)} aria-live="assertive">
                <Icon iconName="Error" className="required-indicator-error-icon" />
                {errorMessage}
            </p>;
        }

        return (
            <div className="fabric-style-overrides">
                <div className={className} >
                    {this.props.children}
                    {errorMessageNode}
                </div>
            </div>
        );
    }

    public componentDidMount() {
        this._isMounted = true;
        // don't trigger any notification during mounting
        // mounting can happen because of some action, triggering notification would trigger other action, this is not allowed
        this._setErrorMessage(true);
    }

    public componentWillUnmount() {
        this._isMounted = false;
    }

    public componentWillReceiveProps(nextProps: IProps) {
        this._delayedSetErrorMessage();
    }

    private _setErrorMessage = (noValidationNotification: boolean = false) => {
        if (this.props.onGetErrorMessage) {
            const result = this.props.onGetErrorMessage() || empty;
            if (result || result === empty) {
                if (typeof result === "string") {
                    this._setErrorMessageState(result, !noValidationNotification);
                }
                else {
                    const currentValidation = ++this._lastValidation;
                    result.then((message) => {
                        if (currentValidation === this._lastValidation) {
                            this._setErrorMessageState(message, !noValidationNotification);
                        }
                    });
                }
            }
        }
    }

    private _setErrorMessageState(message: string, notify: boolean) {
        const currentMessage = this.state.errorMessage;
        if (this._isMounted && !equals(message, currentMessage, true)) {
            this.setState({
                errorMessage: message
            });

            if (notify && this.props.onNotifyValidationResult) {
                this.props.onNotifyValidationResult(message, this.props.value);
            }
        }
    }

    private _delayedSetErrorMessage: () => void;

    private _lastValidation: number;
    private _isMounted: boolean;

    private static __validationDelayMs = 500;
}
