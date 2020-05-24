/// <reference types="react" />

import * as React from "react";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { Item, ItemOverviewAriaProps } from "DistributedTaskControls/Common/Item";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Selectable } from "DistributedTaskControls/Components/Selectable";
import { TooltipIfOverflow } from "DistributedTaskControls/Components/TooltipIfOverflow";
import { InputControlUtils } from "DistributedTaskControls/SharedControls/InputControls/Utilities";
import { Store as ItemSelectionStore } from "DistributedTaskControls/Stores/ItemSelectionStore";

import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { Image, ImageFit } from "OfficeFabric/Image";

import * as Utils_String from "VSS/Utils/String";
import { BrowserCheckUtils } from "VSS/Utils/UI";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/TwoPanelOverview";

export interface ITwoPanelOverviewProps extends ComponentBase.IProps {
    title: string;
    view: JSX.Element;
    item: Item;
    iconClassName?: string;
    src?: string;
    overviewClassName?: string;
    isDraggable?: boolean;
    canParticipateInMultiSelect?: boolean;
    controlSection?: JSX.Element;
    ariaDescription?: string;
    overviewDescription?: string;
    getContextMenuItems?: () => IContextualMenuItem[];
    ariaProps?: ItemOverviewAriaProps;
}

export interface IState {
    isSelected: boolean;
}

export class TwoPanelOverviewComponent extends ComponentBase.Component<ITwoPanelOverviewProps, IState> {

    public componentWillMount() {
        this._overviewNameId = InputControlUtils.getId("TwoPanel");
        this._overviewAriaDescriptionContainerId = InputControlUtils.getId("TwoPanelOverviewAriaDescriptionContainer");
        this._itemSelectionStore = StoreManager.GetStore<ItemSelectionStore>(ItemSelectionStore, this.props.instanceId);
    }

    public componentDidMount() {
        this._itemSelectionStore.addChangedListener(this._handleSelectionChange);
        $(window).on("resize", this._windowResizeHandler);
        this._adjustOverviewWidth();
    }

    public componentWillUnmount() {
        this._itemSelectionStore.removeChangedListener(this._handleSelectionChange);
        $(window).off("resize", this._windowResizeHandler);
    }

    public render(): JSX.Element {

        let overviewIconClassName = "";
        if (this.props.src) {
            overviewIconClassName = "overview-icon-png";
        }
        else {
            overviewIconClassName = "overview-icon-svg";
        }

        overviewIconClassName += " " + this.props.iconClassName + " " + "left";
        let icon = (!!this.props.iconClassName) ? (<Image className={overviewIconClassName} src={this.props.src} imageFit={ImageFit.contain} alt={Utils_String.empty} />) : null;

        let bodyClassName = "overview-body" + " " + this.props.overviewClassName + " " + "left";

        let overviewDescriptionClassName = "overview-description ms-font-s";
        overviewDescriptionClassName += " " + (this.state.isSelected ? "ms-fontColor-neutralSecondary" : "ms-fontColor-neutralTertiary");

        let overviewContainerClassName = "two-panel-overview" + ((!!this.props.cssClass) ? " " + this.props.cssClass : "");
        if (BrowserCheckUtils.isIE()) {
            overviewContainerClassName += " " + "ie-browser-bugfix-695231";
        }

        const ariaProps = this.props.ariaProps || ({} as ItemOverviewAriaProps);
        ariaProps.role = ariaProps.role || "tab";
        ariaProps.describedBy = ariaProps.describedBy || this._overviewAriaDescriptionContainerId;
        const overviewTitleAriaDescribedByElementId = InputControlUtils.getId("two-panel-overview-describedby");

        return (
            <Selectable item={this.props.item}
                instanceId={this.props.instanceId}
                canParticipateInMultiSelect={this.props.canParticipateInMultiSelect}
                isDraggable={this.props.isDraggable}
                controlSection={this.props.controlSection}
                getContextMenuItems={this.props.getContextMenuItems}
                ariaProps={ariaProps}>
                <div ref={(overviewElement) => this._overviewElement = overviewElement} className={overviewContainerClassName} >
                    {icon}
                    <div ref={(overviewBody) => this._overviewBody = overviewBody} className={bodyClassName}>
                        <TooltipIfOverflow tooltip={this.props.title} targetElementClassName="overview-title">
                            <div className="overview-title" id={this._overviewNameId} aria-describedby={overviewTitleAriaDescribedByElementId}>
                                {this.props.title}
                            </div>
                            <div className="hidden" id={overviewTitleAriaDescribedByElementId}>{this.props.ariaDescription}</div>
                        </TooltipIfOverflow>
                        <div className={overviewDescriptionClassName}>
                            {this.props.view}
                        </div>
                        <div className="hidden" id={this._overviewAriaDescriptionContainerId}>{this.props.overviewDescription}</div>
                    </div>
                </div >
            </Selectable>
        ) as JSX.Element;
    }

    private _handleSelectionChange = () => {
        if (this._itemSelectionStore.isItemInSelectedGroup(this.props.item)) {
            this.setState({
                isSelected: true
            });
        }
        else if (this._itemSelectionStore.isItemInPreviouslySelectedGroup(this.props.item)) {
            this.setState({
                isSelected: false
            });
        }
    }

    private _windowResizeHandler = (eventObject: JQueryEventObject) => {
        this._adjustOverviewWidth();
    }

    private _adjustOverviewWidth(): void {
        let overviewBodyWidth = $(this._overviewElement).width() * 80 / 100;
        if (this.props && this.props.isDraggable) {
            if (!!this.props.isDraggable) {
                overviewBodyWidth -= 40; // For gripper.
            }
            if (!!this.props.canParticipateInMultiSelect) {
                overviewBodyWidth -= 40; // For checkbox.
            }
        }

        $(this._overviewBody).width(overviewBodyWidth);
    }

    private _itemSelectionStore: ItemSelectionStore;
    private _overviewBody: HTMLElement;
    private _overviewElement: HTMLElement;
    private _overviewNameId: string;
    private _overviewAriaDescriptionContainerId: string;
}
