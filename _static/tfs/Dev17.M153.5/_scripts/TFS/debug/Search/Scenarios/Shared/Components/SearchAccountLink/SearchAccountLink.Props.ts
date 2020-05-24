export enum IconPosition {
    Left,

    Right
}

export interface ISearchAccountLinkProps {
    /**
    * Url for searching across the account.
    */
    url: string

    /**
    * Invoked upon link click
    */
    onInvoked?: (url?: string) => void;

    /**
    * Value that defines whether to render bowtie to the left or right of link
    */
    iconPlacement: IconPosition;

    /**
    * Bowtie string value to render along with link
    */
    iconClassName: string;

    /**
    * Value that defines which type of component to render
    */
    itemType: "link" | "button";
}
