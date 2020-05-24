
import { IItem } from "ScaledAgile/Scripts/Shared/Models/IItem";
import { CardComponentConstants } from "ScaledAgile/Scripts/Shared/Card/Models/CardConstants";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { ICardRenderingOptions } from "ScaledAgile/Scripts/Shared/Card/Models/ICardSettings";
import { domElem } from "VSS/Utils/UI";

/**
 * Contains utililty methods for Card component
 */
export class CardUtils {

    /**
     * Calculate card height based on values and card settings
     * @param {IItem} item - Item to get the height
     * @param {number} containerWidth - The width of the container
     * @param {ICardSettings} cardSettings - The card settings
     * @return {number} - Pixel height of the card
     */
    public static getCardHeight(item: IItem, containerWidth: number, cardRenderingOptions: ICardRenderingOptions): number {

        let calculatedCardHeight = CardUtils.getCardTitleHeight(item, containerWidth, cardRenderingOptions.showId);
        calculatedCardHeight += CardComponentConstants.contentPaddingTopBottom * 2; //padding for top and bottom of card
        calculatedCardHeight += CardComponentConstants.topRightBottomBorder * 2; //border for top and bottom

        if (!item) {
            // If no item was specified, this is an unsaved "inline add" card with no other content
            return calculatedCardHeight;
        }

        if (containerWidth > CardComponentConstants.largeWidthThreshold) {

            if (cardRenderingOptions.showAssignedTo(item)) {
                calculatedCardHeight += CardComponentConstants.assignedToContainerHeight + CardComponentConstants.fieldPadding;
            }

            // calculate the height of additional fields
            // note that State field is considered as an additional field in terms of height calculation until
            // its position in the card changes
            let additionalFieldsCount = cardRenderingOptions.getAdditionalFields(item).length;
            if (additionalFieldsCount > 0) {
                calculatedCardHeight += CardComponentConstants.fieldPadding; // Padding for the top of the additional fields container
                calculatedCardHeight += CardComponentConstants.additionalFieldHeight * additionalFieldsCount;
                calculatedCardHeight += CardComponentConstants.additionalFieldPadding * (additionalFieldsCount - 1); // Padding for the top of additional fields (minus 1 since top container has padding).
            }

            let tags = item.getFieldValue(CoreFieldRefNames.Tags);
            if (cardRenderingOptions.showTags && tags && tags.length > 0) {
                calculatedCardHeight += CardComponentConstants.tagsHeight + CardComponentConstants.fieldPadding;
            }
        }

        return calculatedCardHeight;
    }

    /**
     * Dictionary of WorkdItem's id + container width -> Height of the card in pixel
     */
    private static titleHeightPerCardCache: IDictionaryNumberTo<IDictionaryNumberTo<number>> = {};

    /**
     * What: Flush all pre-calculated height of a card 
     * Why:  Changing the zoom,  changing configuration require to flush
     */
    public static flushCache(): void {
        CardUtils.titleHeightPerCardCache = {};
    }

    /**
     * What: Remove from the cache a single item
     * Why:  If we modify the title of a single card, we need to make the to flush this one
     */
    public static flushSingleItemCache(idItem: number): void {
        delete CardUtils.titleHeightPerCardCache[idItem];
    }

    /**
     * Returns the calculated height of the title section of the card (minimun of 1 line height)
     * @param {IItem} item - The item
     * @param {number} containerWidth - The width of the container
     * @returns {number} the height of title area
     */
    public static getCardTitleHeight(item: IItem, containerWidth: number, includeId: boolean): number {
        if (!item) {
            return CardComponentConstants.inlineEditTitleHeight;
        }

        const actualHeight = this.getActualTitleHeight(item, containerWidth, includeId);
        const maxLines = containerWidth <= CardComponentConstants.largeWidthThreshold ? CardComponentConstants.titleMaxLines : CardComponentConstants.titleMinLines;

        const height = Math.min(maxLines * CardComponentConstants.titleLineHeight, Math.max(actualHeight, 1 * CardComponentConstants.titleLineHeight))
            + CardComponentConstants.extraHeightForCardToShowLastLineUnderscore;

        return height;
    }

    /**
     * Check if the title overflows the container
     * @param {IItem} item - The item
     * @param {number} containerWidth - The width of the container
     * @returns {boolean} true: title does overflow; false: title doesn't overflow
     */
    public static doesTitleOverflow(item: IItem, containerWidth: number, includeId: boolean): boolean {
        let actualHeight = this.getActualTitleHeight(item, containerWidth, includeId);
        let maxLines = containerWidth <= CardComponentConstants.largeWidthThreshold ? CardComponentConstants.titleMaxLines : CardComponentConstants.titleMinLines;

        return actualHeight > maxLines * CardComponentConstants.titleLineHeight + CardComponentConstants.extraHeightForCardToShowLastLineUnderscore;
    }

    /**
     * Get the actual height of title
     * @param {IItem} item - The item
     * @param {number} containerWidth - The width of the container
     * @returns {number} actual height
     */
    private static getActualTitleHeight(item: IItem, containerWidth: number, includeId: boolean): number {
        if (CardUtils.titleHeightPerCardCache[item.id] && CardUtils.titleHeightPerCardCache[item.id][containerWidth]) {
            return CardUtils.titleHeightPerCardCache[item.id][containerWidth];
        }

        const titleText: string = item.getFieldValue(CoreFieldRefNames.Title) || '';
        const titleWidth = containerWidth - CardComponentConstants.cardMinWidth;

        // **NOTE**: Some of the below styles are duplicated in Card.scss. Ensure that any changes are made in both places.
        // The goal is to match as closely as possible the normal layout for the title of the "Card" React component; because
        // the CSS styles aren't included in the test environment, they must be manually adjusted for here for this to be testable.
        let $div = $(domElem('div')).css({
            'word-wrap': 'break-word',
            'font-size': CardComponentConstants.cardTitleFontSize + 'px',
            'line-height': CardComponentConstants.titleLineHeight + 'px',
            'width': titleWidth + 'px',
            "position": "absolute",
            "top": "-1000px"
        }).appendTo(document.body);
        $div.append($(domElem('div')).css({
            'padding-right': '19px',
            'display': 'inline-block'
        })); // Icon
        if(includeId) {
            $div.append($(domElem('div')).css({
                'padding-right': '8px',
                'font-weight': 'bold',
                'display': 'inline-block'
            }).text(item.id)); // ID
        }
        $div.append($(domElem('div')).css({
            'display': 'inline',
            'white-space': 'pre-wrap'
        }).text(titleText)); // Title
        
        const actualHeight = $div[0].offsetHeight;
        $div.remove();

        if(!CardUtils.titleHeightPerCardCache[item.id]) {
            CardUtils.titleHeightPerCardCache[item.id] = {};
        }
        CardUtils.titleHeightPerCardCache[item.id][containerWidth] = actualHeight;
        return actualHeight;
    }

    /**
     * Checks if value is null or undefined or empty string
     * @param {any} value value to check
     * @returns {boolean} true if it's null or undefined or empty. false otherwise
     */
    public static isNullOrEmpty(value: any): boolean {
        return value === null || value === undefined || value === "";
    }
}
