import * as React from "react";
import * as Diag from "VSS/Diag";

export interface IFormattedMessageLink {
    /**
     * The link message to be displayed.
     */
    text: string;
    /**
     * The href for the link.
     */
    href?: string;
    /**
     * The target attribute for the link.
     */
    target?: string;
    /**
     * The rel attribute for the link.
     */
    rel?: string;
    /**
     * The onClick handler for the link action.
     */
    action?: (event?: React.MouseEvent<HTMLAnchorElement>) => void;
    /**
     * The role attribute to be applied to the anchor element.
     * If none is provided, role is "button"" if action is present, "link" otherwise.
     */
    role?: string;
}

export interface IFormattedMessageProps {
    /**
     * The message to be formatted with {#} substitutions.
     */
    message: string;
    /**
     * The links to be substituted in their respective {index} position into the message.
     */
    links?: IFormattedMessageLink[];
}

const splitRegex = /({\d+})/g;
const matchRegex = /{(\d+)}/;

export var FormattedMessage: React.StatelessComponent<IFormattedMessageProps> =
    (props: IFormattedMessageProps): JSX.Element => {

        if (!props.message) {
            return null;
        }

        if (!props.links || props.links.length === 0) {
            return <span>{props.message}</span>;
        }

        const segments = props.message.split(splitRegex);
        let children: JSX.Element[] = segments.map((segment, idx) => {
            let matches = segment.match(matchRegex);
            if (matches) {
                let index = parseInt(matches[1], 10);
                Diag.Debug.assert(index >= 0 && index < props.links.length, "Incorrect index parsed from the message: " + props.message);
                if (index >= 0 && index < props.links.length) {
                    const link = props.links[index];
                    const role = link.role || (link.action ? "button" : "link");
                    const showLink = link.href || link.action || link.rel || link.target || link.role; // show link only if some property other than text is defined.
                    return showLink
                        ? <a key={idx} href={link.href || null} role={role} onClick={link.action} target={link.target} rel={link.rel}>{link.text}</a>
                        : <span key={idx}>{link.text}</span>;
                }
            }

            return <span key={idx}>{segment}</span>;
        });

        return <span>
            {children}
        </span>;
    };
