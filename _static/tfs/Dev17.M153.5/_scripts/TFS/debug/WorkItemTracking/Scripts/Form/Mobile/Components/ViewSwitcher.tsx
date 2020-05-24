///<reference types="react-addons-css-transition-group" />

import * as React from "react";
import * as ReactDOM from "react-dom";
import { CSSTransitionGroup } from "react-transition-group";

import * as Diag from "VSS/Diag";
import * as Navigation_Services from "VSS/Navigation/Services";
import * as Utils_Core from "VSS/Utils/Core";
import { isNavigationSwipeSupported } from "VSS/Utils/Mobile";
import { getWindowScrollTop, setWindowScrollTop } from "Presentation/Scripts/TFS/TFS.Core.Utils";

const historySvc = Navigation_Services.getHistoryService();

export interface IViewSwitcherProps {
    /** Initial view to display. Uri will not be modified for the default view (if navigation is enabled) */
    defaultView: string;

    /** If set, view switcher will push a new history state for the current view, and react to browser navigation events (e.g., back) */
    supportNavigation?: boolean;

    /** If set, view switches will use CSS transitions */
    supportTransitions?: boolean;

    /** Duration of CSS transitions */
    transitionDurationInMs?: number;

    /** Event is fired when component is switching views. First parameter will be the key of the new view */
    onViewSwitch?: (viewKey: string) => void;
}

/** @internal */
export interface IViewSwitcherState {
    /** Currently active view */
    currentView: string;

    suppressTransition?: boolean;

    transitionStarted?: boolean;

    currentTransition?: {
        from: string;
        to: string
    };
}

interface IViewData {
    index: number;

    /** Props of the view */
    props: IViewProps;

    /** Last body scroll position if preserving scroll position is requested for the view */
    scrollTop?: number;
}

const ViewStateUriKey = "view";

/**
 * Generic component to switch between different views. Includes support for navigation
 */
export class ViewSwitcher extends React.Component<IViewSwitcherProps, IViewSwitcherState> {
    private _transitionDelay: Utils_Core.DelayedFunction;
    private _keyToViewMap: IDictionaryStringTo<IViewData> = {};
    private _previousViewKey: string;

    constructor(props: IViewSwitcherProps, context: any) {
        super(props, context);

        this._buildKeyToIndexMap(props);

        this.state = {
            currentView: this.props.defaultView
        };
    }

    /**
     * Switch to the given view
     * @param viewKey
     */
    public switchView(viewKey: string) {
        this._switchView(viewKey, true);
    }

    public switchToPreviousView() {
        if (this._previousViewKey) {
            this.switchView(this._previousViewKey);
        }
    }

    public componentDidMount() {
        if (this.props.supportNavigation) {
            historySvc.attachNavigate(this._onNavigate);
        }
    }

    public componentWillUnmount() {
        if (this.props.supportNavigation) {
            historySvc.detachNavigate(this._onNavigate);
        }
    }

    private _switchView(toViewKey: string, navigate: boolean, suppressTransition: boolean = false) {
        const currentViewKey = this.state.currentView;

        if (currentViewKey !== toViewKey) {
            // Save current scroll position if requested
            let currentViewData = this._keyToViewMap[currentViewKey];
            if (currentViewData.props.keepScrollPosition) {
                currentViewData.scrollTop = getWindowScrollTop();
            }

            const useTransition = this.props.supportTransitions && !suppressTransition;

            this.setState({
                currentView: toViewKey,
                suppressTransition: suppressTransition,
                currentTransition: useTransition && {
                    from: currentViewKey,
                    to: toViewKey
                }
            } as IViewSwitcherState, () => {
                this._previousViewKey = currentViewKey;

                if (navigate) {
                    // Add new history point
                    if (this.props.supportNavigation) {
                        this._addHistoryPoint(currentViewKey, toViewKey);
                    }
                }

                // Restore scroll position if requested
                let toViewData = this._keyToViewMap[toViewKey];
                if (toViewData.props.keepScrollPosition && toViewData.scrollTop) {
                    setWindowScrollTop(toViewData.scrollTop);

                    Utils_Core.delay(null, 0, () => {
                        // Sometimes scroll position gets reset after processing events, so
                        // set it here as well.
                        setWindowScrollTop(toViewData.scrollTop);
                    });
                }

                // Fire event to consumer
                if (this.props.onViewSwitch) {
                    this.props.onViewSwitch(toViewKey);
                }

                if (useTransition) {
                    // When transitions are supported we need to reset the transition state after the timeout elapsed
                    if (this._transitionDelay) {
                        // Cancel any earlier delay
                        this._transitionDelay.cancel();
                    }

                    this._transitionDelay = Utils_Core.delay(null, TICK + this.props.transitionDurationInMs, () => {
                        this.setState({
                            currentTransition: null
                        } as any);

                        this._resetScrollPosition(toViewData);
                    });
                }
                else {
                    this._resetScrollPosition(toViewData);
                }
            });
        }
    }

    private _resetScrollPosition(viewData: IViewData) {
        if (!viewData.props.keepScrollPosition) {
            setWindowScrollTop(0);
        }
    }

    private _addHistoryPoint(fromViewKey: string, toViewKey: string) {
        if (toViewKey === this.props.defaultView) {
            // When navigating to the default view, just go back in the history.
            window.history.back();
        } else {
            let currentState = historySvc.getCurrentState();
            let currentAction = currentState && currentState.action;
            const viewData = { [ViewStateUriKey]: toViewKey };

            if (fromViewKey !== this.props.defaultView) {
                // We are navigating between child views, replace the history point so going back brings us to the 
                // default view.
                historySvc.replaceHistoryPoint(currentAction, viewData, null, true);
            } else {
                // We are navigating from default to a sub-view, add a new history point, to support going back to
                // the default view.
                historySvc.addHistoryPoint(currentAction, viewData, null, true);
            }
        }
    }

    /** Navigation handler */
    private _onNavigate = () => {
        const state = historySvc.getCurrentState();
        const newViewKey = state && state[ViewStateUriKey] || this.props.defaultView;

        this._switchView(newViewKey, false, isNavigationSwipeSupported());
    };

    public componentWillReceiveProps(nextProps: IViewSwitcherProps) {
        this._buildKeyToIndexMap(nextProps);
    }

    private _buildKeyToIndexMap(props: IViewSwitcherProps) {
        this._keyToViewMap = {};

        React.Children.forEach(this.props.children, (child: React.ReactChild, index: number) => {
            if (typeof child === "object") {
                const view: View = child as any;

                this._keyToViewMap[child.key] = {
                    index: index,
                    props: view.props
                };
            }
        });
    }

    public render() {
        const wrapperClassName = "view-group";
        let children = this._renderViews();

        if (this.props.supportTransitions) {
            const useTransition = !this.state.suppressTransition;

            return <CSSTransitionGroup
                component="div"
                className={wrapperClassName}
                transitionName="view"
                transitionAppear={useTransition}
                transitionAppearTimeout={this.props.transitionDurationInMs}
                transitionEnter={useTransition}
                transitionEnterTimeout={this.props.transitionDurationInMs}
                transitionLeave={useTransition}
                transitionLeaveTimeout={this.props.transitionDurationInMs}>
                {children}
            </CSSTransitionGroup>;
        }

        return <div className={wrapperClassName}>
            {children}
        </div>;
    }

    private _renderViews() {
        return React.Children.map(this.props.children, (child: React.ReactChild, idx: number) => {
            if (typeof child === "object") {
                const view: View = child as any;

                const isCurrentView = child.key === this.state.currentView;
                const isFromTransition = this.state.currentTransition && child.key === this.state.currentTransition.from;
                const isToTransition = this.state.currentTransition && child.key === this.state.currentTransition.to;
                const isInTransition = isFromTransition || isToTransition;
                const isVisible = isCurrentView || isInTransition;

                if (child.type === FixedView) {
                    // Always render this view, and just hide it if it's not required right now
                    return <ViewWrapper
                        className={view.props.className}
                        isHidden={!isVisible}
                        transitionActive={isInTransition}
                        transitionTimeoutInMs={this.props.transitionDurationInMs}>
                        {child}
                    </ViewWrapper>;
                } else if (isCurrentView) {
                    // Only render if it's the current view
                    return <ViewWrapper className={view.props.className}>
                        {child}
                    </ViewWrapper>;
                }
            }

            return null;
        }).filter(x => !!x);
    }
}

export interface IViewProps {
    /** Unique identifier of the view */
    key: string;

    /** Optional class name to set for the wrapped view */
    className?: string;

    /** If set, the current scroll position will be preserved when leaving this view, and restored the next time it becomes active */
    keepScrollPosition?: boolean;
}

export class View extends React.Component<IViewProps, {}> {
    public render(): JSX.Element {
        return <div>
            {this.props.children}
        </div>;
    }
}

/**
 * View that is always in the DOM, it's only hidden when not active
 */
export class FixedView extends View {
}


interface IViewWrapperProps {
    /** Class name to apply to the view wrapper */
    className: string;

    /** Value indicating whether the view is currently hidden */
    isHidden?: boolean;

    /** Value indicating whether transition is currently active */
    transitionActive?: boolean;

    /**  */
    transitionTimeoutInMs?: number;
}

/**
 * Use the same TICK delay as the CSSTransitionGroup. This should make sure that dom operations before are flushed, and then
 * trigger the transition.
 */
const TICK = 17;

/**
 * Wraps a view and if requested triggers transitions.
 *
 * Note: Since `FixedView`s are always kept in the DOM they are not automatically animated by the CSSTransitionGroup so we have
 * manually do that here.
 */
class ViewWrapper extends React.Component<IViewWrapperProps, {}> {
    private _toVisible: boolean;
    private _shouldStartTransition: boolean;

    public componentWillReceiveProps(nextProps: IViewWrapperProps) {
        if (this.props.transitionActive !== nextProps.transitionActive && nextProps.transitionActive) {
            // Component was not in active transition, but is now
            this._shouldStartTransition = true;

            // If the component was hidden before, then the transition is to the hidden state and vice versa
            this._toVisible = this.props.isHidden;
        }
    }

    public componentDidUpdate() {
        // Component has been rendered, start any scheduled transitions
        if (this._shouldStartTransition) {
            this._shouldStartTransition = false;

            let domNode = ReactDOM.findDOMNode(this) as HTMLElement;

            // Ensure element has been updated. We don't use opacity, but retrieving it forces the element to be calculated.
            window.getComputedStyle(domNode).opacity;

            if (this._toVisible) {
                domNode.classList.add("view-enter");

                Utils_Core.delay(null, TICK, () => domNode.classList.add("view-enter-active"));

                // Cleanup transition classes
                Utils_Core.delay(null, this.props.transitionTimeoutInMs + TICK, () => domNode.classList.remove("view-enter", "view-enter-active"));
            } else {
                domNode.classList.add("view-leave");

                Utils_Core.delay(null, TICK, () => domNode.classList.add("view-leave-active"));

                // Cleanup transition classes
                Utils_Core.delay(null, this.props.transitionTimeoutInMs + TICK, () => domNode.classList.remove("view-leave", "view-leave-active"));
            }
        }
    }

    public render() {
        return <div style={{ display: this.props.isHidden ? "none" : "block" }} className={"view " + (this.props.className || "")}>
            {this.props.children}
        </div>;
    }
}