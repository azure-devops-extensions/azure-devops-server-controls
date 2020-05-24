import { IIdentityReference } from "Presentation/Scripts/TFS/TFS.OM.Identities";

export interface ICommentBubbleProps {
    /** Optional classname for root element */
    className?: string;

    /** Optional classname for content section */
    contentClassName?: string;

    /** Comment author */
    author: IIdentityReference;

    /** Date the comment was made */
    dateTime: Date;

    /** Content to display. Has to be sanitized, will be rendered as is as html */
    htmlText: string;

    /** Optional callback to get a reference to the element that contains htmlText */
    contentRef?: (elment: HTMLElement) => void;
}
