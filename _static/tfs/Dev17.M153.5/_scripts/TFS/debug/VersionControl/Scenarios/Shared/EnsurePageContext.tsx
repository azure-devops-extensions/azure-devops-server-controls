import * as React from "react";
import * as PropTypes from "prop-types";
import { IVssPageContext } from "VSS/Platform/Context";
import { ReactRootComponent, IVssComponentContext } from "VSS/Platform/Layout";

let globalPageContext: IVssPageContext;

export function getGlobalPageContext(): IVssPageContext {
    return globalPageContext;
}

/**
 * Saves the pageContext from these options, to be used in nested LWP components.
 * @param options The options of a Hub that contains the LWP pageContext
 */
export function setGlobalPageContext(options: { _pageContext: IVssPageContext }): void {
    globalPageContext = options._pageContext;
}

export interface EnsurePageContextProps extends React.Props<{}> {
    /**
     * If true, it will render `onFallback` always, no matter the context.
     * Convenient property to avoid duplicating logic when a FF disables the new component.
     */
    forceFallback?: boolean;

    /**
     * If provided, used as a replacement when page context is not available.
     */
    onFallback?(): JSX.Element;
}

/**
 * Component that will add pageContext for LWP components.
 * Does nothing if pageContext is already in React context.
 */
export const EnsurePageContext: React.StatelessComponent<EnsurePageContextProps> =
    (props: EnsurePageContextProps, context: IVssComponentContext) => {
        if (!props.forceFallback) {
            if (context.pageContext) {
                return React.Children.only(props.children);
            }

            if (globalPageContext) {
                return <ReactRootComponent pageContext={getGlobalPageContext()}>
                    {React.Children.only(props.children)}
                </ReactRootComponent>;
            }
        }

        return props.onFallback
            ? props.onFallback()
            : React.Children.only(props.children);
}

/**
 * We need to duplicate this from LWP components to check if pageContext is in React Context.
 */
EnsurePageContext.contextTypes = {
    pageContext: PropTypes.object
};
