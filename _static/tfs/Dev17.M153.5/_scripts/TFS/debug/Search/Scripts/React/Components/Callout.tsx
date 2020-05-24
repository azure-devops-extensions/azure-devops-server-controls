/// <reference types="react" />
/// <reference types="react-dom" />
import * as React from "react";
import * as ReactDOM from "react-dom";
import { css, autobind, getId } from "OfficeFabric/Utilities";
import { Callout } from "OfficeFabric/Callout";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { filterCategoryViewProps } from "Search/Scripts/React/Common";
import { ICalloutTriggable } from "Search/Scripts/React/Models";

import "VSS/LoaderPlugins/Css!Search/React/Components/Callout";

export interface ICalloutComponentProps {
    targetElementSelector: string,
    title: string,
    content: string,
    id: string
}

/**
 * Stateless component to render the office fabric callout bubble attached to a DOM element give by
 * props.targetElementSelector.
 * @param props
 */
var CalloutComponent: React.StatelessComponent<ICalloutComponentProps> = (props: ICalloutComponentProps) => {
    return (
        <Callout
            className={css("search-Callout")}
            role="tooltip"
            gapSpace={5}
            directionalHint={DirectionalHint.bottomCenter}
            target={props.targetElementSelector}
            setInitialFocus={false} >
            <div id={props.id}>
                <div className={css("search-Callout-header")}>
                    <p className={css("search-Callout-title")}>
                        {props.title}
                    </p>
                </div>
                <div className={css("search-Callout-inner")}>
                    <div className={css("search-Callout-content")}>
                        <p className={css("search-Callout-subText")}>
                            {props.content}
                        </p>
                    </div>
                </div>
            </div>
        </Callout>
    );
}

export type ComponentType<TProps, TState> = new (p: TProps) => React.Component<TProps, TState>;

interface ICalloutWrapperState {
    calloutShown: boolean;
}

/**
 * Class factory method to return a Higher order component wrapping the functionality related to showing callout when the filters are disabled.
 * @param Component
 */
export function getCalloutAble<TProps extends ICalloutTriggable>(Component: ComponentType<TProps, any>): ComponentType<TProps, any> {
    return class CalloutWrapper extends React.Component<TProps, ICalloutWrapperState> {
        constructor(props: TProps) {
            super(props);
            this.state = { calloutShown: false };
        }

        public render(): JSX.Element {
            let disabledInfoId = getId("search-DisabledFilter-Info-"),
                calloutId = getId("search-Filter--CalloutId");

            return (
                <div className="callout-Component--container">
                    <Component
                        {...this.props}
                        triggerCallout={this.triggerCallout.bind(this)}
                        calloutAnchor={disabledInfoId}
                        ariaDescribedby={calloutId} />
                    {
                        // Render call out component
                        this.state.calloutShown &&
                        this.props.calloutProps &&
                        <CalloutComponent
                            targetElementSelector={"#" + disabledInfoId}
                            title={this.props.calloutProps["title"]}
                            content={this.props.calloutProps["content"]}
                            id={calloutId} />
                    }
                </div>);
        }

        /**
         * Set the callout state so that is hidden when the control gets enabled after getting the search response.
         * @param newProps
         */
        public componentWillReceiveProps(newProps: TProps): void {
            this.setState({ calloutShown: false });
        }

        private triggerCallout(show: boolean): void {
            this.setState({ calloutShown: show });
        }
    };
}