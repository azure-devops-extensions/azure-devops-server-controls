/// <reference types="react" />

import * as React from "react";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { OverlayPanelStore } from "DistributedTaskControls/Stores/OverlayPanelStore";
import { OverlayPanelActionsCreator } from "DistributedTaskControls/Actions/OverlayPanelActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { ScrollUtilty } from "DistributedTaskControls/Common/ScrollUtility";
import { SelectableBase, ISelectableBaseState } from "DistributedTaskControls/Components/SelectableBase";
import { Item } from "DistributedTaskControls/Common/Item";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";

import * as Utils_Core from "VSS/Utils/Core";
import * as Diag from "VSS/Diag";

import { KeyCodes, css, autobind } from "OfficeFabric/Utilities";
import { TooltipDelay, TooltipHost, ITooltipHostProps } from "VSSUI/Tooltip";
import { DirectionalHint } from "OfficeFabric/ContextualMenu";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/OverlayPanelSelectable";

export interface IOverviewPanelSelectableProps extends ComponentBase.IProps {
    getItem: () => Item;
    isValid?: boolean;
    tooltipProps?: ITooltipHostProps;
    ariaLabel?: string;
    ariaLive?: "off" | "assertive" | "polite";
    disabled?: boolean;
    onShowOverlayPanel?: () => void;
}

export interface IOverviewPanelSelectableState extends ISelectableBaseState {
    isExpanded: boolean;
}

export class OverlayPanelSelectable extends SelectableBase<IOverviewPanelSelectableProps, IOverviewPanelSelectableState> {

    constructor(props: IOverviewPanelSelectableProps) {
        super(props);
        this._scrollUtility = new ScrollUtilty(this.c_horizontalScrollOver, this.c_verticalScrollOver);
    }

    public componentWillMount() {
        super.componentWillMount();
        this._overlayPanelActionsCreator = ActionCreatorManager.GetActionCreator<OverlayPanelActionsCreator>(OverlayPanelActionsCreator, this.props.instanceId);
        this._overlayPanelStore = StoreManager.GetStore<OverlayPanelStore>(OverlayPanelStore, this.props.instanceId);
    }

    public componentDidMount() {
        super.componentDidMount();
        $(window).on("resize", this._windowResizeHandler);

        if (this._element) {
            let currentElement = this._element;
            while (currentElement && !currentElement.classList.contains("scrollable-container")) {
                currentElement = currentElement.parentElement;
            }

            if (currentElement) {
                this._scrollableContainer = currentElement;
            }
        }

        this._scrollIntoView(false, false);
        this._overlayPanelStore.addChangedListener(this._handleOverlayPanelStoreChanged);
    }

    public componentWillUnmount() {
        $(window).off("resize", this._windowResizeHandler);
        this._overlayPanelStore.removeChangedListener(this._handleOverlayPanelStoreChanged);
        super.componentWillUnmount();
    }

    public componentDidUpdate() {
        this._scrollIntoView(true, true);
    }

    public render(): JSX.Element {
        const ariaDescribedById = "dtc-id-overlay-panel-selectable-" + DtcUtils.getUniqueInstanceId();
        if (this.props.tooltipProps) {
            const toolTipClassNames = css("overlay-panel-selectable-tooltip", this.props.tooltipProps.hostClassName);
            let tooltipProps: ITooltipHostProps = {
                directionalHint: this.props.tooltipProps.directionalHint || DirectionalHint.topCenter,
                content: this.props.tooltipProps.content,
                hostClassName: toolTipClassNames,
                delay: this.props.tooltipProps.delay || TooltipDelay.medium
            };
            tooltipProps = { ...this.props.tooltipProps, ...tooltipProps };
            return (
                <TooltipHost {...tooltipProps} id={ariaDescribedById}>
                    {this._getContent()}
                </TooltipHost>
            );
        }
        else {
            return this._getContent();
        }
    }

    protected getItem(): Item {
        return this.props.getItem();
    }

    protected getElement(): HTMLElement {
        return this._element;
    }

    private _getContent(): JSX.Element {
        const classNames = css("overlay-panel-selectable", this.props.cssClass, {
            "dtc-overlay-selected": this.state.isSelected,
            "dtc-overlay-invalid": this.props.isValid === undefined ? false : !this.props.isValid,
            "dtc-overlay-disabled": this.props.disabled
        });

        /* tslint:disable:react-a11y-role-supports-aria-props */
        return (
            <div
                aria-selected={this.state.isSelected}
                aria-expanded={this.state.isExpanded}
                aria-controls="dtc-id-overlay-component-right-pane"
                className={classNames}
                ref={this._resolveRef("_element")}
                onFocus={this._handleFocus}
                aria-disabled={this.props.disabled}
                onKeyDown={this._handleKeyDown}
                onClick={this._handleClick}
                data-is-focusable={true}
                aria-label={this.props.ariaLabel || (this.props.tooltipProps ? this.props.tooltipProps.content : "")}
                aria-live={this.props.ariaLive}>
                {this.props.children}
            </div>
        ) as JSX.Element;
        /* tslint:enable:react-a11y-role-supports-aria-props */
    }

    private _windowResizeHandler = () => {
        this._scrollIntoView(false, false);
    }

    private _scrollIntoView(afterDelay: boolean, animate: boolean): void {
        if (this._element && this._scrollableContainer && this.state.isSelected && !this._scrollInProgress) {

            let selectedElementBoundingRect = this._element.getBoundingClientRect();
            let scrollableContainerBoundingRect = this._scrollableContainer.getBoundingClientRect();
            let isHorizontalScrollbarVisible = this._scrollableContainer.scrollWidth > scrollableContainerBoundingRect.width;
            let isVerticalScrollbarVisible = this._scrollableContainer.scrollHeight > scrollableContainerBoundingRect.height;

            let scrollOffset = this._scrollUtility.getScrollOffset(selectedElementBoundingRect, scrollableContainerBoundingRect, isHorizontalScrollbarVisible, isVerticalScrollbarVisible);

            if (scrollOffset.top || scrollOffset.left) {
                Diag.logVerbose(`ScrollTop = ${scrollOffset.top} ScrollLeft = ${scrollOffset.left}`);
                this._scrollInProgress = true;
                if (afterDelay) {
                    Utils_Core.delay(this, 300, () => {
                        this._performScroll(scrollOffset.top, scrollOffset.left, animate);
                    });
                }
                else {
                    this._performScroll(scrollOffset.top, scrollOffset.left, animate);
                }
            }
        }
    }

    private _performScroll(scrollTopoffSet: number, scrollLeftoffSet: number, animate: boolean): void {
        if (animate) {

            // Animating using JQuery is ridiculously easy. So used JQuery here.
            let $scrollableContainer = $(this._scrollableContainer);
            const scrollAnimationDuration = 500;
            if (this._scrollableContainer) {
                if (scrollTopoffSet && !scrollLeftoffSet) {
                    $scrollableContainer.animate(
                        { scrollTop: this._scrollableContainer.scrollTop + scrollTopoffSet },
                        scrollAnimationDuration,
                        this._handleScrollAnimationComplete);
                }
                else if (scrollLeftoffSet && !scrollTopoffSet) {
                    $scrollableContainer.animate(
                        { scrollLeft: this._scrollableContainer.scrollLeft + scrollLeftoffSet },
                        scrollAnimationDuration,
                        this._handleScrollAnimationComplete);
                }
                else if (scrollTopoffSet && scrollLeftoffSet) {
                    $scrollableContainer.animate(
                        {
                            scrollTop: this._scrollableContainer.scrollTop + scrollTopoffSet,
                            scrollLeft: this._scrollableContainer.scrollLeft + scrollLeftoffSet
                        }, scrollAnimationDuration, this._handleScrollAnimationComplete);
                }
            }
        }
        else {
            if (scrollTopoffSet) {
                this._scrollableContainer.scrollTop += scrollTopoffSet;
            }

            if (scrollLeftoffSet) {
                this._scrollableContainer.scrollLeft += scrollLeftoffSet;
            }
        }

        this._scrollInProgress = false;
    }

    private _handleScrollAnimationComplete = () => {
        // After scrolling with animation if the element is still not visible, then scroll to final position without animation.
        this._scrollIntoView(false, false);
    }

    private _handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
        const storeState = this._overlayPanelStore.getState();

        // Use space and enter to open the panel if closed and close the panel id it is open.
        if ((e.keyCode === KeyCodes.enter || e.keyCode === KeyCodes.space) &&
            e.target === this._element &&
            !this.props.disabled) {

            if (!storeState.showDetails) {
                this._showOverlayPanel();
            }
            else {
                this._overlayPanelActionsCreator.hideOverlay();
            }
            e.stopPropagation();
            e.preventDefault();
        }
    }

    private _handleClick = () => {
        const storeState = this._overlayPanelStore.getState();
        if (!storeState.showDetails && !this.props.disabled) {
            this._showOverlayPanel();

            //ToDo: #1016974 This is an office fabric command bar bug where they stop propagating event when overflow item is disabled and contextual menu is not dismissed.
            //Should remove the below code piece once this issue gets fixed.
            //We are explicitly handling focus as it does not get called by command bar on contextualMenuDismiss for disabled overflow item in it.
            this._handleFocus();
        }
    }

    private _showOverlayPanel(): void {
        this._overlayPanelActionsCreator.showOverlay();
        if (this.props.onShowOverlayPanel) {
            this.props.onShowOverlayPanel();
        }
    }

    private _handleFocus = () => {
        if (!this.props.disabled) {
            const item: Item = this.props.getItem();
            if (item) {
                this.getItemSelectorActions().selectItem.invoke({ data: item });
            }
        }
    }

    @autobind
    private _handleOverlayPanelStoreChanged(): void {
        const storeState = this._overlayPanelStore.getState();
        this.setState({ isExpanded: storeState.showDetails } as IOverviewPanelSelectableState);
    }

    private _overlayPanelActionsCreator: OverlayPanelActionsCreator;
    private _overlayPanelStore: OverlayPanelStore;
    private _element: HTMLElement;
    private _scrollUtility: ScrollUtilty;
    private _scrollableContainer: HTMLElement;
    private _scrollInProgress = false;

    // Additional scroll over the usual horizontal scroll done to bring the node in view
    private readonly c_horizontalScrollOver = 300;

    // Additional scroll over the usual vertical scroll done to bring the node in view
    private readonly c_verticalScrollOver = 50;
}
