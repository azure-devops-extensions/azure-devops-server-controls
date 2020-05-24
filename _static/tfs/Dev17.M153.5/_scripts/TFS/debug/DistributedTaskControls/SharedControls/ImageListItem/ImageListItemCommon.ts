export enum ImageSize {
    /**
    * Image + primary
    */
    Small,
    /**
    * Image + primary + optional secondary text
    */
    Medium
}

export interface IImageListItemCommonProps {
    primaryText: string;
    imageSize: ImageSize;
    secondaryText?: string;
    className?: string;
    ariaLabelledById?: string;
}