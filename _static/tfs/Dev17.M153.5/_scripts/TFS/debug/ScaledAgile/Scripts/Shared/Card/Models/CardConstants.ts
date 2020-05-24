/**
 * Constants for the card components
 */
export namespace CardComponentConstants {
    /**
     * Border size in pixels of the left border of the card
     */
    export const leftBorder = 6;
    /**
     * Border size of the grey border that runs around the card
     */
    export const topRightBottomBorder = 1;

    /**
     * Padding in pixels that the card container will have for top and bottom. 
     */
    export const contentPaddingTopBottom = 8;
    /**
     * Padding in pixels that the card container will have for left and right. 
     */
    export const contentPaddingLeftRight = 6;

    /**
     * Width threshold between a small and large card
     */
    export const largeWidthThreshold = 110;

    /**
     * Default line height for the card title
     */
    export const titleLineHeight = 16;

    /**
     * The link underscore of the last line needs extra line height to show up when hovering on it. The 4 is to adjust the height for the link
     */
    export const extraHeightForCardToShowLastLineUnderscore = 2;

    /**
     * The maximum number of lines for the title (used when the width threshold changes)
     */
    export const titleMaxLines = 5;
    /**
     * The minimum number of lines for the title (used when the width threshold changes)
     */
    export const titleMinLines = 3;
    /**
     * Average size of a letter in pixels for a card title
     */
    export const averagePixelLengthOfTitleLetter = 8;
    /**
     * Value in pixels used to space fields container sections on the card
     */
    export const fieldPadding = 8;
    /**
     * Height of the assigned to container on the card
     */
    export const assignedToContainerHeight = 24;

    /**
     * Height of the tags container on the card
     */
    export const tagsHeight = 22;

    /**
     * Height of any additional field containers
     */
    export const additionalFieldHeight = 16;
    /**
     * Value in pixels used to space additional fields within the additional fields container
     */
    export const additionalFieldPadding = 4;

    /**
     * The font size for the title on card
     */
    export const cardTitleFontSize = 12;

    /**
     * Minimum width for the card
     */
    export const cardMinWidth = CardComponentConstants.leftBorder + CardComponentConstants.topRightBottomBorder + (CardComponentConstants.fieldPadding * 2);

    /**
     * Height of the textarea for inline edit mode
     */
    export const inlineEditTitleHeight = CardComponentConstants.titleLineHeight * 2 + 8; // 8px is padding

    /**
     * Consumer Id for Identity components
     */
    export const additionalFieldIdentityControlConsumerId = "a9bc69ca-d7c4-40cf-94a4-5013816a44ff";
    export const cardIdentityControlConsumerId = "1310fa1f-e636-40a4-9cea-b3e7b182f47f";
}