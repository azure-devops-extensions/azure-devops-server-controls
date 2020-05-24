import 'VSS/LoaderPlugins/Css!ScaledAgile/Scripts/Shared/Card/Components/Card';

import { autobind } from 'OfficeFabric/Utilities';
import { KeyCode } from 'VSS/Utils/UI';
import * as React from 'react';

import { IContextualMenuItem } from 'OfficeFabric/components/ContextualMenu/ContextualMenu.types';
import { TooltipHost, TooltipOverflowMode } from 'VSSUI/Tooltip';
import { Identity } from 'Presentation/Scripts/TFS/Components/Identity';
import { WorkItemTypeIcon } from 'Presentation/Scripts/TFS/Components/WorkItemTypeIcon';
import {
    WorkItemTypeColorAndIcons,
    WorkItemTypeColorAndIconsProvider,
} from 'Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider';
import { CoreFieldRefNames } from 'Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants';
import { WorkItemStatesColorProvider } from 'Presentation/Scripts/TFS/TFS.OM.Common';
import { Color } from 'Presentation/Scripts/TFS/TFS.UI.Controls.ColorPicker';
import * as CardResources from 'ScaledAgile/Scripts/Resources/TFS.Resources.Card';
import { AdditionalFields } from 'ScaledAgile/Scripts/Shared/Card/Components/AdditionalFields';
import { Tags } from 'ScaledAgile/Scripts/Shared/Card/Components/Tags';
import { CardComponentConstants } from 'ScaledAgile/Scripts/Shared/Card/Models/CardConstants';
import { ICardRenderingOptions, IdentityPickerRenderingOption } from 'ScaledAgile/Scripts/Shared/Card/Models/ICardSettings';
import { CardUtils } from 'ScaledAgile/Scripts/Shared/Card/Utils/CardUtils';
import { IItem, ItemSaveStatus } from 'ScaledAgile/Scripts/Shared/Models/IItem';
import { EDisplayControlType } from 'VSS/Identities/Picker/Controls';
import { ContributableContextualMenu, IContributionData } from 'VSSPreview/Flux/Components/ContributableContextMenu';
import { contextualMenuIcon } from 'VSSPreview/OfficeFabric/Helpers';

export interface ICardProps {
    /**
     * The open action, invoked when clicking on title of the card
     */
    open: (id: number) => void;
    /**
     * The data for the card
     */
    item: IItem;
    /*
     * A description of the location of this card to be appended to the card's aria-label
     */
    contextDescription: string;
    /**
     * The max width of the item
     */
    maxWidth: number;
    /**
     * Instead of rendering the card render a placeholder instead.
     */
    renderPlaceholder: boolean;
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

    /**
     * What: Hook on the html mouse down of the card
     * Why: Allow to know when the card got clicked. Example: Used to determing when to drag the card or pan.
     */
    onMouseDown?: (card: Card, e: React.MouseEvent<HTMLDivElement>) => void;

    /**
     * What: Hook on the html mouse up of the card
     * Why: Allow to know when the card got released. 
     */
    onMouseUp?: (card: Card, e: React.MouseEvent<HTMLDivElement>) => void;

    /**
     * Keydown handler.
     */
    onKeyDown?: (card: Card, e: React.KeyboardEvent<HTMLElement>) => void;

    /**
     * Whether to focus on the next render of card whether it be on mount or on update
     */
    focusAfterRender?: boolean;
}

export interface ICardState {
    /**
     * Indicates if the card is focused.
     */
    focused?: boolean;
    /**
     * Indicates if the card context menu is open.
     */
    showContextMenu?: boolean;
}

/**
 * Card component that visualizes a Work Item in form of a Card. 
 */
export class Card extends React.Component<ICardProps, ICardState> {
    public static ClickableTitleLinkClass = "clickable-title-link";
    public static ITEM_PROCESSING_CLASS = "item-processing";
    public static ITEM_STATUS_CLASS = "item-status";
    public static ITEM_ERROR_CLASS = "item-error";
    public static ITEM_SAVING_CLASS = "item-saving";
    public static CSS_ITEM_ANIMATION = "progress-animation";
    public static CSS_ITEM_ANIMATION_ON = "progress-animation-on";
    /**
     * Default value if the animation is called without having a property defined the value of the time the animation must goes on
     */
    public static CSS_ANIMATION_DEFAULT = 500;

    private _itemDom: HTMLDivElement;
    private _animationContainerDom: HTMLDivElement;
    private _contextMenuEllipsisDom: HTMLDivElement;

    private _focusAfterRender: boolean = false;

    constructor(props: ICardProps) {
        super(props);
        this.state = { focused: false };
    }

    /**
     * Set focus to this card. Do not call this if the card is not in view.
     */
    public focus(): void {
        if (this._itemDom) {
            this._itemDom.focus();
        }
    }

    public shouldComponentUpdate(nextProps: ICardProps, nextState: ICardState): boolean {
        if (nextProps.focusAfterRender !== this.props.focusAfterRender || (!this.state.focused && nextProps.focusAfterRender)) {
            this._focusAfterRender = nextProps.focusAfterRender;
        }

        // If any properties that affect this card changed, allow it to re-render
        // If it was only external world state, ignore this change
        const shouldUpdate = this.props.item !== nextProps.item ||
            this.props.maxWidth !== nextProps.maxWidth ||
            this.state.focused !== nextState.focused ||
            this.state.showContextMenu !== nextState.showContextMenu ||
            this.props.stateColorsProvider !== nextProps.stateColorsProvider ||
            this.props.renderingOptions !== nextProps.renderingOptions ||
            this.props.focusAfterRender !== nextProps.focusAfterRender ||
            this.props.renderPlaceholder !== nextProps.renderPlaceholder ||
            this._focusAfterRender;
        return shouldUpdate;
    }

    public render(): JSX.Element {
        if (!this.props.item) {
            return null;
        }

        if (this.props.renderPlaceholder) {
            return this._renderCardPlaceholder();
        }

        return this._renderCard();
    }

    private _renderCardPlaceholder(): JSX.Element {
        return <div
            id={String(this.props.item.id)}
            className="plans-card card-placeholder"
            style={{ height: this.props.item.height }}
        >
        </div>;
    }

    private _renderCard(): JSX.Element {
        const workItemType = this.props.item.getFieldValue(CoreFieldRefNames.WorkItemType);
        let color = this.props.workItemTypeColorAndIcons.getColorAndIcon(workItemType).color;

        let containerStyle = {
            maxWidth: this.props.maxWidth,
            borderColor: this.state.focused || this.state.showContextMenu ? color : "",
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

        const ariaLabel = `${this.props.item.getFieldValue(CoreFieldRefNames.WorkItemType)} ${this.props.item.getFieldValue(CoreFieldRefNames.Title)}, ${this.props.contextDescription}`;

        return <div
            ref={(element) => { this._itemDom = element; }}
            id={String(this.props.item.id)}
            className={this._getClassName()}
            style={cardStyle}
            tabIndex={-1}
            onContextMenu={this._onContextMenu}
            onFocus={this._setFocus}
            onBlur={this._onBlur}
            onKeyDown={this._onKeyDown}
            onMouseDown={this._onMouseDown}
            onMouseUp={this._onMouseUp}
            role="group"
            aria-roledescription={CardResources.AriaRoleDescription}
            aria-label={ariaLabel}>
            <div className={Card.CSS_ITEM_ANIMATION} ref={(element) => { this._animationContainerDom = element; }}>
                <div className="container" style={containerStyle}>
                    {this._renderIdAndTitle()}
                    {this._renderAssignedTo()}
                    {this._renderAdditionalFields()}
                    {this._renderTags()}
                    {this._renderSaveStatus()}
                    {this._renderContextMenu()}
                </div>
            </div>
        </div>;
    }

    private _getClassName(): string {
        let className = "plans-card card-materialized" + (this.state.focused ? " focus" : "");
        className += (this.props.item && (this.props.item.saveStatus === ItemSaveStatus.IsSaving || this.props.item.saveStatus === ItemSaveStatus.Error)) ? " " + Card.ITEM_PROCESSING_CLASS : "";
        return className;
    }

    public componentDidUpdate() {
        if (this._itemDom && this._focusAfterRender) {
            // render() has been invoked but the actual element may not have been rendered by the browser yet. requestAnimationFrame() to force layout.
            window.requestAnimationFrame(() => {
                // By the time this happens things could have changed - so recheck to see if we still need to set focus.
                if (this._itemDom && this._focusAfterRender && !this.state.showContextMenu) {
                    this._itemDom.focus();
                }
                this._focusAfterRender = false;
            })
        }
    }

    public componentWillReceiveProps(nextProps: ICardProps) {
        CardUtils.flushSingleItemCache(this.props.item.id);
    }

    public componentDidMount() {
        if (this._itemDom && this.props.focusAfterRender) {
            this._itemDom.focus();
        }
    }

    /**
     * Public for unit test
     */
    @autobind
    public _setFocus() {
        this.setState({ focused: true });
    }

    @autobind
    private _onBlur() {
        this._removeFocus();
    }

    /**
     * Public for unit test
     */
    public _removeFocus() {
        this.setState({ focused: false });
    }

    public _onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
        if ($.isFunction(this.props.onKeyDown)) {
            this.props.onKeyDown(this, e);
            if (e.isPropagationStopped()) {
                return;
            }
        }
        if (e.keyCode === KeyCode.ENTER) {
            this._openItem();
        }
    }

    /**
     * Renders the id and title section of the card
     * @returns The jsx element of the id and title
     */
    private _renderIdAndTitle(): JSX.Element {
        let idElement: JSX.Element = null;

        if (this.props.renderingOptions.showId) {
            idElement = <div className="id">{this.props.item.id}</div>;
        }

        let idTitleContainerStyle: any = {
            lineHeight: CardComponentConstants.titleLineHeight + "px",
            height: CardUtils.getCardTitleHeight(this.props.item, this.props.maxWidth, this.props.renderingOptions.showId)
        };

        const workItemType = this.props.item.getFieldValue(CoreFieldRefNames.WorkItemType);
        const colorAndIcon = this.props.workItemTypeColorAndIcons.getColorAndIcon(workItemType);
        const workItemTypeIcon = <WorkItemTypeIcon
            workItemTypeName={workItemType}
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

    private _openItem = () => {
        if (this.props.item && this.props.item.id > 0) { // don't open card with invalid id i.e. card that is in the process of creation.
            this.props.open(this.props.item.id);
        }
    }

    /**
     * Renders the the title element of the card
     * @returns Title jsx element (adds ellipsis and toolip if applicable)
     */
    private _renderTitle(): JSX.Element {
        const title = this.props.item.getFieldValue(CoreFieldRefNames.Title);
        const shouldShowTooltip = CardUtils.doesTitleOverflow(this.props.item, this.props.maxWidth, this.props.renderingOptions.showId);

        return <div className="title">
            <a className={Card.ClickableTitleLinkClass} onClick={this._openItem} role="button">
                {
                    shouldShowTooltip ? <TooltipHost content={title}>{title}</TooltipHost> : title
                }
            </a>
            {
                shouldShowTooltip ? <div className="card-ellipsis">...</div> : null
            }
        </div>;
    }

    /**
     * Renders the assigned to field of the card
     * @returns The jsx element of the assignedTo control
     */
    private _renderAssignedTo(): JSX.Element {
        if (this.props.renderingOptions.showAssignedTo(this.props.item) && this.props.maxWidth > CardComponentConstants.largeWidthThreshold) {

            let assignedTo = this.props.item.getFieldValue(CoreFieldRefNames.AssignedTo);
            let assignedToStyle: any = {
                height: CardComponentConstants.assignedToContainerHeight,
                marginTop: CardComponentConstants.fieldPadding
            };

            let assignedToRenderingOption = this.props.renderingOptions.assignedToRenderingOption;
            let identityPickerDisplayFormat: EDisplayControlType;
            switch (assignedToRenderingOption) {
                case IdentityPickerRenderingOption.AvatarOnly:
                    identityPickerDisplayFormat = EDisplayControlType.AvatarOnly;
                    break;
                case IdentityPickerRenderingOption.FullName:
                    identityPickerDisplayFormat = EDisplayControlType.TextOnly;
                    break;
                default:
                    identityPickerDisplayFormat = EDisplayControlType.AvatarText;
            }

            return <Identity containerStyle={assignedToStyle} consumerId={CardComponentConstants.cardIdentityControlConsumerId} className="assigned-to-container" value={assignedTo} displayFormat={identityPickerDisplayFormat} />;
        }
        return null;
    }

    /**
     * Renders an cards additional fields
     * @returns The jsx element of the rendered additional fields
     */
    private _renderAdditionalFields(): JSX.Element {
        let card = this.props.item;
        let additionalFields = this.props.renderingOptions.getAdditionalFields(card);
        if (additionalFields.length > 0 && this.props.maxWidth > CardComponentConstants.largeWidthThreshold) {
            let teamProjectName = card.getFieldValue(CoreFieldRefNames.TeamProject);
            let getStateColor = (value: string): string => {
                if (this.props.stateColorsProvider) {
                    return this.props.stateColorsProvider.getWorkItemStateColor(teamProjectName, card.getFieldValue(CoreFieldRefNames.WorkItemType), value);
                }
                return "";
            };
            return <AdditionalFields item={card} fields={additionalFields} getStateColor={getStateColor} />;
        }
        return null;
    }

    /**
     * Renders the tags of the work item
     * @returns The jsx element of the tags control
     */
    private _renderTags(): JSX.Element {
        if (this.props.renderingOptions.showTags && this.props.maxWidth > CardComponentConstants.largeWidthThreshold) {
            let tags = this.props.item.getFieldValue(CoreFieldRefNames.Tags);
            let maxWidth = this.props.maxWidth - CardComponentConstants.cardMinWidth;
            let tagsStyle: any = {
                height: CardComponentConstants.tagsHeight,
                marginTop: CardComponentConstants.fieldPadding,
                overflow: "hidden"
            };
            if (tags && tags.length > 0) {
                return <Tags containerStyle={tagsStyle} maxWidth={maxWidth} className="tags-container" value={tags} />;
            }
        }
        return null;
    }

    /**
     * Renders the saving status of the work item
     * @returns The jsx element of the save status
     */
    private _renderSaveStatus(): JSX.Element {
        const saveStatus = this.props.item.saveStatus;
        switch (saveStatus) {
            case ItemSaveStatus.IsSaving:
                return <div className={Card.ITEM_STATUS_CLASS + " " + Card.ITEM_SAVING_CLASS}>
                    <TooltipHost content={CardResources.ItemSavingState} overflowMode={TooltipOverflowMode.Parent}>
                        {CardResources.ItemSavingState}
                    </TooltipHost>
                </div>;

            case ItemSaveStatus.Error:
                return <div className={Card.ITEM_STATUS_CLASS + " " + Card.ITEM_ERROR_CLASS}>
                    <TooltipHost content={(this.props.item && this.props.item.message) || CardResources.ItemErrorState}>
                        {CardResources.ItemErrorState}
                    </TooltipHost>
                </div>;
        }

        return null;
    }

    /**
     * Renders the context menu ellipsis button 
     * @returns The JSX.Element of the context menu
     */
    private _renderContextMenu(): JSX.Element {
        return <div className={`context-menu ${this.state.showContextMenu ? "open" : ""}`}
            ref={(element) => { this._contextMenuEllipsisDom = element; }}
            role="button"
            aria-label={CardResources.OpenContextMenuTooltip}
            onClick={this._showContextMenu}>
            <div className="bowtie-icon bowtie-ellipsis" />
            {this.state.showContextMenu && this._renderContextMenuPopup()}
        </div>;
    }

    /**
     * Renders the context menu popup menu
     * @returns The JSX.Element of the context menu popup
     */
    private _renderContextMenuPopup(): JSX.Element {
        const items: IContextualMenuItem[] = [{
            key: "open-item",
            name: CardResources.Open,
            title: CardResources.Open,
            iconProps: contextualMenuIcon("bowtie-arrow-open"),
            onClick: this._openItem
        }];

        const contributionData: IContributionData = {
            contributionIds: ["ms.vss-work-web.work-item-context-menu", "ms.vss-plans.card-context-menu"],
            extensionContext: {
                id: this.props.item.id,
                workItemType: this.props.item.getFieldValue(CoreFieldRefNames.WorkItemType)
            }
        };

        return <ContributableContextualMenu
            items={items}
            onDismiss={this._hideContextMenu}
            shouldFocusOnMount={true}
            gapSpace={0}
            target={this._contextMenuEllipsisDom}
            contributionData={contributionData} />;
    }

    /**
     * Handler for onContextMenu event on the card. Invoked via right click or Shift + F10.
     */
    private _onContextMenu = (event: React.MouseEvent<HTMLElement>) => {
        event.preventDefault();
        event.stopPropagation();
        this._showContextMenu();
    }

    /**
     * Handler for opening the context menu.
     */
    private _showContextMenu = () => {
        this.setState({ showContextMenu: true });
    }

    /**
     * Handler for closing the context menu.
     */
    private _hideContextMenu = () => {
        this.setState({ showContextMenu: false });
    }

    /**
     * What: Start the animation on the card
     * Why: We need to manually start the animation from what ever external task. For example, waiting to drag the card.
     * 
     * @param {number} delayInMs? : Set the time for the progress. If not set, the animation will be running forever in a loop 
     *          between the call of startProgressionAnimation and stopProgressionAnimation. 
     */
    public startProgressionAnimation(delayInMs?: number): void {
        const $animationDom = $(this._animationContainerDom);
        $animationDom.css("animation-duration", (delayInMs ? delayInMs : Card.CSS_ANIMATION_DEFAULT) + "ms", );
        $animationDom.css("animation-iteration-count", delayInMs ? "1" : "infinite");
        const workItemType = this.props.item.getFieldValue(CoreFieldRefNames.WorkItemType);
        const hexcolor = this.props.workItemTypeColorAndIcons.getColorAndIcon(workItemType).color;
        const rgb1 = new Color(hexcolor).asRgb().replace(")", ",0.30)").replace("rgb(", "rgba(");
        const rgb2 = new Color(hexcolor).asRgb().replace(")", ",0)").replace("rgb(", "rgba(");
        $animationDom.css("background-image", "linear-gradient(90deg, " + rgb1 + " 50%, " + rgb2 + " 50%)");
        $animationDom.addClass(Card.CSS_ITEM_ANIMATION_ON);
        if (delayInMs > 0) {
            setTimeout(() => this.stopProgressionAnimation(), delayInMs);
        }
    }

    /**
     * What: End the progression animation
     * Why: The card had an idea of the time it will way because of the delayInMs by props but this is for the animation (UI)
     *      purpose, the real code might be +- different, hence we need to stop the animation when the task is really over.
     */
    public stopProgressionAnimation(): void {
        const $animationDom = $(this._animationContainerDom);
        $animationDom.css("background-image", "");
        $animationDom.removeClass(Card.CSS_ITEM_ANIMATION_ON);
        $animationDom.css("animation-duration", "");
        $animationDom.css("animation-iteration-count", "");
    }

    /**
     * Mouse down on the card - this is here because the sortable component on the interval is stopping the mouse down event from bubbling. This
     * stops the browser from setting focus or blurring.
     */
    private _onMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
        if ($.isFunction(this.props.onMouseDown)) {
            this.props.onMouseDown(this, e);
        }
    }

    private _onMouseUp = (e: React.MouseEvent<HTMLDivElement>): void => {
        if ($.isFunction(this.props.onMouseUp)) {
            this.props.onMouseUp(this, e);
        }
    }
}
