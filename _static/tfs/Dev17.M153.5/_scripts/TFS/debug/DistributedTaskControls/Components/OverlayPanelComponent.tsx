/// <reference types="react" />

import * as React from "react";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { FunctionKeyCodes, DomAttributeConstants } from "DistributedTaskControls/Common/Common";
import { Boolean } from "DistributedTaskControls/Common/Primitives";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { Item } from "DistributedTaskControls/Common/Item";
import { Store as ItemSelectionStore, IState as ItemSelectionState, IOptions } from "DistributedTaskControls/Stores/ItemSelectionStore";
import { OverlayPanelStore, IOverlayPanelState, IOverlayPanelStoreArgs } from "DistributedTaskControls/Stores/OverlayPanelStore";
import { OverlayPanelActionsCreator } from "DistributedTaskControls/Actions/OverlayPanelActionsCreator";
import { isFocusable } from "DistributedTaskControls/Common/FocusHelper";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { ItemInformation } from "DistributedTaskControls/Actions/ItemSelectorActions";
import { TelemetryUtils } from "DistributedTaskControls/Common/TelemetryUtils";

import { CommandButton, IButton } from "OfficeFabric/Button";
import { css, KeyCodes, getParent } from "OfficeFabric/Utilities";

import { Splitter } from "VSSPreview/Flux/Components/Splitter";
import { delay } from "VSS/Utils/Core";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/OverlayPanelComponent";

export interface IProps extends ComponentBase.IProps {

    /**
     * Default item
     */
    defaultItem?: Item;

    /**
     * Left header ARIA region label
     */
    leftPaneARIARegionRoleLabel: string;

    /**
     * Right header ARIA region label
     */
    rightPaneARIARegionRoleLabel: string;

    detailsPanelInitialWidth?: number;

    isRightPaneScrollable?: boolean;
}

export interface IState extends ItemSelectionState, IOverlayPanelState {
}


export class OverlayPanelComponent extends ComponentBase.Component<IProps, IState> {

    public componentWillMount() {
        this._overlayPanelActionsCreator = ActionCreatorManager.GetActionCreator<OverlayPanelActionsCreator>(OverlayPanelActionsCreator, this.props.instanceId);

        this._itemSelectionStore = StoreManager.CreateStore<ItemSelectionStore, IOptions>(
            ItemSelectionStore,
            this.props.instanceId,
            {
                defaultSelection: this.props.defaultItem ? [{ data: this.props.defaultItem }] : []
            });

        this._overlayPanelStore = StoreManager.CreateStore<OverlayPanelStore, IOverlayPanelStoreArgs>(OverlayPanelStore, this.props.instanceId, { detailsPaneWidth: this._getInitialWidth() });

        this.setState(this._itemSelectionStore.getState() as IState);
        this.setState(this._overlayPanelStore.getState() as IState);
    }

    public componentDidMount() {
        this._itemSelectionStore.addChangedListener(this._onSelectionChange);
        this._overlayPanelStore.addChangedListener(this._onOverlayPanelStoreChange);
        this._detailsElement = this._splitterComponent.refs.splitter.querySelector(".details-panel") as HTMLElement;

        // For accessibility.
        this._detailsElement.id = "dtc-id-overlay-component-right-pane";

        this._toggleSplitter();
        this._registerDomEventListeners();
    }

    public componentWillUnmount() {
        this._itemSelectionStore.removeChangedListener(this._onSelectionChange);
        this._overlayPanelStore.removeChangedListener(this._onOverlayPanelStoreChange);
        this._unregisterDomEventListeners();
    }

    public componentDidUpdate() {
        this._toggleSplitter();
        if (this._rightSection) {
            this._focusOnCloseButton();
            if (!this._overlayHeaderLabel) {
                const overlayHeaderLabels = this._rightSection.querySelectorAll(".overlay-panel-heading-row label");
                if (overlayHeaderLabels.length > 0) {
                    this._overlayHeaderLabel = overlayHeaderLabels[0].textContent;
                }
                else {
                    // Use the default if overlay header is not present in the component.
                    this._overlayHeaderLabel = this.props.rightPaneARIARegionRoleLabel;
                }

                this._rightSection.setAttribute("aria-label", this._overlayHeaderLabel);
            }
        }
    }

    public render(): JSX.Element {

        let left = (
            <div className="overlay-left-section"
                ref={this._resolveRef("_leftSection")}
                onFocus={this._handleLeftSectionFocus}
                onKeyDown={this._handleLeftSectionKeydown}
                role="region"
                aria-label={this.props.leftPaneARIARegionRoleLabel}>

                {this.props.children}

            </div>
        );

        let right: JSX.Element = null;
        let rightSectionClassName = css("overlay-right-section", {"right-section-scrollable" : !!this.props.isRightPaneScrollable});
        if (this._showDetails()) {
            right = (
                <div className={rightSectionClassName}
                    data-is-scrollable={!!this.props.isRightPaneScrollable}
                    ref={this._resolveRef("_rightSection")}
                    onFocus={this._handleRightSectionFocus}
                    onKeyDown={this._handleRightSectionKeydown}
                    role="region">

                    <CommandButton
                        componentRef={this._resolveRef("_closeButton")}
                        className="overlay-panel-close-button"
                        ariaLabel={Resources.CloseButtonText}
                        iconProps={{ iconName: "Cancel" }}
                        onClick={this._closePanel}>
                    </CommandButton>

                    <div className="overlay-right-section-content">
                        {this._getSelectedItemContent()}
                    </div>
                </div>
            );
        }

        return (
            <Splitter
                ref={this._resolveRef("_splitterComponent")}
                cssClass="horizontal hub-splitter overlay-panel-component right-fix"
                fixedSide="right"
                leftClassName="overview-panel scrollable-container"
                rightClassName="details-panel"
                left={left}
                right={right}
                initialSize={this.state.detailsPaneWidth || this._getInitialWidth()}
                minWidth={this.c_rightPaneMinWidth}
            />
        );
    }

    private _windowResizeHandler = () => {
        if (this._detailsElement && this.state.showDetails) {
            // This is intentional. Window resize handler is not just called when the user re-sizes the splitter
            // but also when the splitter is toggled. In the case when the splitter is toggled, this gets called in 
            // the context of an action. 
            //
            // This should not be an issue as this action is just used to update the state in the store without any
            // UI side rendering.
            delay(this, 10, () => {
                this._overlayPanelActionsCreator.setDetailsPanelWidth(this._detailsElement.clientWidth);
            });
        }
    }

    private _toggleSplitter(): void {
        if (this._splitterComponent) {
            if (this._showDetails()) {
                this._splitterComponent.expand();
            }
            else {
                this._splitterComponent.collapse();
            }
        }
    }

    private _showDetails(): boolean {
        let content: JSX.Element = this._getSelectedItemContent();
        return this.state.showDetails && !!content;
    }

    private _focusOnCloseButton() {
        if (!!this.state.focusOnCloseButton && this._closeButton) {
            this._closeButton.focus();
        }
    }

    private _resetFocusOnCloseButtonState() {
        if (!!this.state.focusOnCloseButton) {
            this.setState({ focusOnCloseButton: false });
        }
    }

    private _registerDomEventListeners() {
        $(window).on("resize", this._windowResizeHandler);
    }

    private _handleRightSectionFocus = (ev: React.FocusEvent<HTMLElement>) => {
        // Record the latest element on the right section that has focus.
        this._rightSectionFocusElement = ev.target as HTMLElement;
        this._resetFocusOnCloseButtonState();
    }

    private _handleRightSectionKeydown = (ev: React.KeyboardEvent<HTMLElement>) => {
        if (ev.which === FunctionKeyCodes.F6 && ev.ctrlKey && this._leftSectionFocusElement) {

            TelemetryUtils.publishCanvasKeyboardAccessTelemetry("F6");

            this._addFocusVisibleToFabricParent(ev);

            // Move the focus to the latest element on the left section that had focus.
            this._focusElement(this._leftSectionFocusElement);
            ev.stopPropagation();
            ev.preventDefault();
        }
        else if (ev.which === KeyCodes.escape) {
            this._closePanel();
            ev.stopPropagation();
            ev.preventDefault();
        }
    }

    private _handleLeftSectionFocus = (ev: React.FocusEvent<HTMLElement>) => {
        // Record the latest element on the left section that has focus.
        this._leftSectionFocusElement = ev.target as HTMLElement;
        this._resetFocusOnCloseButtonState();
    }

    private _handleLeftSectionKeydown = (ev: React.KeyboardEvent<HTMLElement>) => {
        if (ev.which === FunctionKeyCodes.F6 && ev.ctrlKey) {

            TelemetryUtils.publishCanvasKeyboardAccessTelemetry("F6");

            this._addFocusVisibleToFabricParent(ev);

            if (this.state.showDetails) {
                // Move focus only if details pane is open.

                let focusElementFound = false;
                if (this._rightSectionFocusElement) {
                    // Move focus to the latest focused element on the right section (if it exists)
                    this._focusElement(this._rightSectionFocusElement);
                    focusElementFound = true;
                }
                else if (this._rightSection) {
                    // Find the first element that has data-first-focus-element attribute set to true.
                    let elements = this._rightSection.querySelectorAll(`[${DomAttributeConstants.FirstFocusAttrib}]`);
                    if (elements.length > 0) {
                        const htmlElement = elements.item(0) as HTMLElement;
                        if (htmlElement && Boolean.isTrue(htmlElement.getAttribute(DomAttributeConstants.FirstFocusAttrib))) {
                            if (isFocusable(htmlElement)) {
                                // If the first element with the attribute is focusable, then move the focus to it.
                                this._focusElement(htmlElement);
                                focusElementFound = true;
                            }
                            else if (this._focusOnFirstFocusableElement(htmlElement.querySelectorAll("*"))) {
                                // If the element marked with attribute is not focusable, then move the focus to the 
                                // first child element that can take focus. This has been done to ease setting attribute
                                // on container elements instead of directly setting attribute on the exact element in 
                                // the hierarchy.
                                focusElementFound = true;
                            }
                        }
                    }

                    // If an element could not be found using attribute match, transfer focus to the first
                    // focusable element on the right pane.
                    elements = this._rightSection.querySelectorAll("*");
                    if (!focusElementFound && this._focusOnFirstFocusableElement(elements)) {
                        focusElementFound = true;
                    }
                }

                if (focusElementFound) {
                    ev.preventDefault();
                    ev.stopPropagation();
                }
            }
        }
    }

    private _addFocusVisibleToFabricParent(ev: React.KeyboardEvent<HTMLElement>) {
        // Workaround till the Office Fabric issue is fixed.
        // F6 should be added to the list of navigational keys in Fabric. 
        let target = ev.target as HTMLElement;
        const ownerBody = target.ownerDocument.body;
        while (target && target !== ownerBody) {
            if (target.classList.contains("ms-Fabric")) {
                target.classList.add("is-focusVisible");
                break;
            }

            target = getParent(target);
        }
    }

    private _focusOnFirstFocusableElement(elements: NodeListOf<Element>): boolean {
        for (let i = 0, len = elements.length; i < len; i++) {
            const htmlElement = elements.item(i) as HTMLElement;
            if (htmlElement && isFocusable(htmlElement)) {
                this._focusElement(htmlElement);
                return true;
            }
        }

        return false;
    }

    private _focusElement(htmlElement: HTMLElement): void {
        htmlElement.focus();
    }

    private _unregisterDomEventListeners() {
        $(window).off("resize", this._windowResizeHandler);
    }

    private _onSelectionChange = () => {
        let selectedItem: ItemInformation;
        if (this.state && this.state.selectedItems && this.state.selectedItems.length > 0) {
            selectedItem = this.state.selectedItems[0];
        }

        const itemSelectionState = this._itemSelectionStore.getState() as IState;
        let newSelectedItem: ItemInformation;
        if (itemSelectionState && itemSelectionState.selectedItems && itemSelectionState.selectedItems.length > 0) {
            if (selectedItem && selectedItem.data.getKey() !== itemSelectionState.selectedItems[0].data.getKey()) {
                // If the selection has changed, then reset the element to focus in details pane.
                this._rightSectionFocusElement = null;
                this._overlayHeaderLabel = null;
            }
        }

        this.setState(itemSelectionState);
    }

    private _onOverlayPanelStoreChange = () => {
        this._previousOverlayPanelState = this.state as IOverlayPanelState;
        const newState = this._overlayPanelStore.getState();

        this.setState(newState as IState, this._focusLeftSectionElement);
    }

    private _focusLeftSectionElement = (): void => {

        if (!!this._previousOverlayPanelState.showDetails !== this.state.showDetails) {
            this._rightSectionFocusElement = null;

            // When the details panel is closed, move focus to the latest focused element on the left section.
            if (!this.state.showDetails) {
                let data = this.state.selectedItems && this.state.selectedItems.length > 0 ? this.state.selectedItems[0].data : null;

                if (data && data.onHideDetails) {
                    data.onHideDetails();
                }
                else if (this._leftSectionFocusElement) {
                    setTimeout(() => {
                        // when hide overlay is called from within a promise, 
                        // it is observed that select item action gets called in sync
                        // causing action withing action issue. 
                        // Hence adding set timeout
                        this._leftSectionFocusElement.focus();
                    }, 0);
                }
            }
        }
    }

    private _getSelectedItemContent(): JSX.Element {
        let content: JSX.Element = null;
        let selectedItem = this.state.selectedItems[0];
        if (selectedItem && selectedItem.data) {
            content = selectedItem.data.getDetails ? selectedItem.data.getDetails(this.props.instanceId) : null;
        }

        return content;
    }

    private _closePanel = () => {
        if (this.state.showDetails) {
            this._overlayPanelActionsCreator.hideOverlay();
        }
    }

    private _getInitialWidth(): number {
        return this.props.detailsPanelInitialWidth || Math.max(this.c_rightPaneMinWidth, window.outerWidth * this.c_initialWidthPercent / 100);
    }

    private _itemSelectionStore: ItemSelectionStore;
    private _overlayPanelStore: OverlayPanelStore;
    private _overlayPanelActionsCreator: OverlayPanelActionsCreator;
    private _splitterComponent: Splitter;
    private  _previousOverlayPanelState: IOverlayPanelState;

    private _detailsElement: HTMLElement;

    private _leftSection: HTMLElement;
    private _rightSection: HTMLElement;
    private _leftSectionFocusElement: HTMLElement;
    private _rightSectionFocusElement: HTMLElement;
    private _overlayHeaderLabel: string;

    private _closeButton: IButton;

    private c_initialWidthPercent = 35;
    private c_rightPaneMinWidth = 600;

}

