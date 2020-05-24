import 'VSS/LoaderPlugins/Css!ScaledAgile/Scripts/Shared/Card/Components/Card';

import { autobind } from 'OfficeFabric/Utilities';
import * as Diag from 'VSS/Diag';
import * as React from 'react';
import { KeyCode } from 'VSS/Utils/UI';
import * as Utils_String from 'VSS/Utils/String';

import { TooltipHost, TooltipOverflowMode } from 'VSSUI/Tooltip';
import { WorkItemTypeIcon } from 'Presentation/Scripts/TFS/Components/WorkItemTypeIcon';
import {
    WorkItemTypeColorAndIcons,
    WorkItemTypeColorAndIconsProvider,
} from 'Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider';
import { WorkItemStatesColorProvider } from 'Presentation/Scripts/TFS/TFS.OM.Common';
import * as CardResources from 'ScaledAgile/Scripts/Resources/TFS.Resources.Card';
import { CardComponentConstants } from 'ScaledAgile/Scripts/Shared/Card/Models/CardConstants';
import { ICardRenderingOptions } from 'ScaledAgile/Scripts/Shared/Card/Models/ICardSettings';
import { CardUtils } from 'ScaledAgile/Scripts/Shared/Card/Utils/CardUtils';
import { ItemSaveStatus } from 'ScaledAgile/Scripts/Shared/Models/IItem';

export interface IInlineAddCardProps {
    /**
     * The max width of the item
     */
    maxWidth: number;
    /**
     * Card rendering options
     */
    renderingOptions: ICardRenderingOptions;
    /**
     * Colors provider for the card 
     */
    workItemTypeColorAndIcons: WorkItemTypeColorAndIcons;
    /**
     * state colors provider
     */
    stateColorsProvider?: WorkItemStatesColorProvider;


    workItemType: string;

    /**
     * Callback invoked when the user submits their specified title value.
     */
    onSubmit?: (newTitle: string) => void;

    /**
     * Callback invoked when the user aborts the inline add action.
     */
    onAbort?: () => void;

    /**
     * The current save-related status code for this work item.
     * If specified, configures the card to render itself with the usual read-only title and display a save status banner.
     * If omitted, an edit box is displayed instead.
     */
    saveStatus?: ItemSaveStatus

    /**
     * The title for this inline add card (for use in combination with saveStatus)
     */
    title?: string;
}

export class InlineAddCard extends React.Component<IInlineAddCardProps, {}> {
    public static ClickableTitleLinkClass = "clickable-title-link";
    public static ITEM_PROCESSING_CLASS = "item-processing";
    public static ITEM_STATUS_CLASS = "item-status";
    public static ITEM_ERROR_CLASS = "item-error";
    public static ITEM_SAVING_CLASS = "item-saving";

    private _itemDom: HTMLDivElement;

    private _focusAfterRender: boolean = false;

    private _inlineAddTextAreaRef: HTMLTextAreaElement;

    public render(): JSX.Element {
        let color = this.props.workItemTypeColorAndIcons.getColorAndIcon(this.props.workItemType).color;

        let containerStyle = {
            maxWidth: this.props.maxWidth,
            borderColor: color,
            paddingTop: CardComponentConstants.contentPaddingTopBottom,
            paddingBottom: CardComponentConstants.contentPaddingTopBottom,
            paddingLeft: CardComponentConstants.contentPaddingLeftRight,
            paddingRight: CardComponentConstants.contentPaddingLeftRight
        };

        let cardStyle = {
            maxWidth: this.props.maxWidth,
            borderLeftColor: color,
            outline: "none",
        };

        return <div
            ref={(element) => { this._itemDom = element; }}
            id={"inline-add-card"}
            className={this._getClassName()}
            style={cardStyle}
            tabIndex={-1}
            onBlur={this._onBlur}>
            <div>
                {this._renderInlineAddCardContents(containerStyle)}
            </div>
        </div>;
    }

    private _renderInlineAddCardContents(containerStyle: any): JSX.Element {
        let titleElement: JSX.Element;
        let saveStatusElement: JSX.Element = null;

        if (this.props.title) { // Has content, render it
            titleElement = this._renderIdAndTitle();
            saveStatusElement = this._renderSaveStatus()
        }
        else {
            const idTitleContainerStyle: any = {
                lineHeight: CardComponentConstants.titleLineHeight + "px",
                height: CardComponentConstants.inlineEditTitleHeight
            };

            titleElement = <div style={idTitleContainerStyle} className="id-title-container inline-edit">
                <textarea
                    className="inline-edit-title-box"
                    maxLength={255}
                    ref={ref => this._inlineAddTextAreaRef = ref}
                    onKeyDown={this._onInlineAddKeyDown}
                    onMouseDown={this._onMouseDown}
                    onMouseMove={this._onMouseMove}
                    aria-label={Utils_String.format(CardResources.InlineAddAriaLabel, this.props.workItemType)} />
            </div>
        }

        return <div className="container" style={containerStyle}>
            {titleElement}
            {saveStatusElement}
        </div>;
    }

    private _getClassName(): string {
        let className = "plans-card card-materialized inline-add-card";
        className += (this.props.title && (this.props.saveStatus === ItemSaveStatus.IsSaving || this.props.saveStatus === ItemSaveStatus.Error)) ? " " + InlineAddCard.ITEM_PROCESSING_CLASS : "";
        return className;
    }

    public componentDidUpdate() {
        if (this._itemDom && this._focusAfterRender) {
            // render() has been invoked but the actual element may not have been rendered by the browser yet. requestAnimationFrame() to force layout.
            window.requestAnimationFrame(() => {
                // By the time this happens things could have changed - so recheck to see if we still need to set focus.
                if (this._itemDom && this._focusAfterRender) {
                    this._itemDom.focus();
                }
                this._focusAfterRender = false;
            })
        }
    }

    public componentDidMount() {
        if (!this._isInlineAddWithContent() && this._inlineAddTextAreaRef) {
            this._inlineAddTextAreaRef.focus();
        }
    }

    private _isInlineAddWithContent(): boolean {
        return this.props.saveStatus != null;
    }

    @autobind
    private _onBlur() {
        if (this._inlineAddTextAreaRef && this._inlineAddTextAreaRef.value) {
            this._inlineAddSubmit();
        }
        else {
            this._inlineAddAbort();
        }
    }

    @autobind
    private _inlineAddSubmit() {
        if (!this._isInlineAddWithContent() && this.props.onSubmit) {
            Diag.Debug.assertIsNotNull(this._inlineAddTextAreaRef);
            this.props.onSubmit(this._inlineAddTextAreaRef.value);
        }
    }
    @autobind
    private _inlineAddAbort() {
        if (!this._isInlineAddWithContent() && this.props.onAbort) {
            this.props.onAbort();
        }
    }

    /**
     * Renders the id and title section of the card
     * @returns The jsx element of the id and title
     */
    private _renderIdAndTitle(): JSX.Element {
        let idElement: JSX.Element = null;

        let idTitleContainerStyle: any = {
            lineHeight: CardComponentConstants.titleLineHeight + "px",
            height: CardUtils.getCardTitleHeight(null, this.props.maxWidth, this.props.renderingOptions.showId)
        };

        const colorAndIcon = this.props.workItemTypeColorAndIcons.getColorAndIcon(this.props.workItemType);
        const workItemTypeIcon = <WorkItemTypeIcon
            workItemTypeName={this.props.workItemType}
            projectName=""
            customInput={{
                color: colorAndIcon.color,
                icon: colorAndIcon.icon
            }} />;

        return <div style={idTitleContainerStyle} className="id-title-container">
            {workItemTypeIcon}
            {idElement}
            {this._renderTitle()}
        </div>;
    }

    private _renderTitle(): JSX.Element {
        return <div className="title">
            <span>
                {this.props.title}
            </span>
        </div>;
    }

    /**
     * Renders the saving status of the work item
     * @returns The jsx element of the save status
     */
    private _renderSaveStatus(): JSX.Element {
        const saveStatus = this.props.saveStatus;
        switch (saveStatus) {
            case ItemSaveStatus.IsSaving:
                return <div className={InlineAddCard.ITEM_STATUS_CLASS + " " + InlineAddCard.ITEM_SAVING_CLASS}>
                    <TooltipHost content={CardResources.ItemSavingState} overflowMode={TooltipOverflowMode.Parent}>
                        {CardResources.ItemSavingState}
                    </TooltipHost>
                </div>;

            case ItemSaveStatus.Error:
                return <div className={InlineAddCard.ITEM_STATUS_CLASS + " " + InlineAddCard.ITEM_ERROR_CLASS}>
                    <TooltipHost content={CardResources.ItemErrorState}>
                        {CardResources.ItemErrorState}
                    </TooltipHost>
                </div>;
        }

        return null;
    }

    @autobind
    private _onInlineAddKeyDown(e: React.KeyboardEvent<HTMLElement>) {
        if (e.keyCode === KeyCode.ENTER) {
            e.preventDefault();
            this._inlineAddSubmit();
        }
        else if (e.keyCode === KeyCode.ESCAPE) {
            e.preventDefault();
            this._inlineAddAbort();
        }
    }

    @autobind
    private _onMouseDown(e: React.MouseEvent<HTMLTextAreaElement>) {
        // Prevent panning the page when attempting to select text
        e.stopPropagation();
    }

    @autobind
    private _onMouseMove(e: React.MouseEvent<HTMLTextAreaElement>) {
        // Prevent panning the page when attempting to select text
        e.stopPropagation();
    }
}
