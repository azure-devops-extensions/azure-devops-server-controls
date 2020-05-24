import * as React from "react";
import * as Diag from "VSS/Diag";

export interface IDeliveryTimelineFormattedMessageLink {
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
     * The onClick handler for the link action.
     */
    action?: (event?: React.MouseEvent<HTMLAnchorElement>) => void;
    /**
     * The onKeyDown handler for the link.
     */
    onKeyDown?: (event: React.KeyboardEvent<HTMLAnchorElement>) => void;
    /**
     * The role attribute to be applied to the anchor element.
     * If none is provided, role is "button"" if action is present, "link" otherwise.
     */
    role?: string;
}

export interface IDeliveryTimelineFormattedMessageProps {
    /**
     * The message to be formatted with {#} substitutions.
     */
    message: string;
    /**
     * The links to be substituted in their respective {index} position into the message.
     */
    links?: IDeliveryTimelineFormattedMessageLink[];
}

const splitRegex = /({\d+})/g;
const matchRegex = /{(\d+)}/;

/**
 * This is a mix of the functionality of FormattedMessage (in Presentation) and OfficeFabric FocusZone. We should be able to replace this with
 * <FocusZone><FormattedMessage></...> but FocusZone currently overrides our tabindexes automatically adding tabindex 0 the our dom. We don't want that.
 * FocusZone should be updated to only optionally set the tab index to 0 so we can focus() to the zone but not tab to it. Ideally it would also allow handling
 * "at end of zone" so we can leave the zone. Once that is done we can delete this.
 */
export class DeliveryTimelineFormattedMessage extends React.Component<IDeliveryTimelineFormattedMessageProps, {}> {
    private _refs: HTMLAnchorElement[] = [];

    public focus(index: number) {
        if (index < this._refs.length && index >= 0) {
            const element = this._refs[index];
            element.focus();
        }
    }

    public render(): JSX.Element {
        if (!this.props.message) {
            return null;
        }

        if (!this.props.links || this.props.links.length === 0) {
            return <span>{this.props.message}</span>;
        }

        const segments = this.props.message.split(splitRegex);
        let children: JSX.Element[] = segments.map((segment, idx) => {
            let matches = segment.match(matchRegex);
            if (matches) {
                let index = parseInt(matches[1], 10);
                Diag.Debug.assert(index >= 0 && index < this.props.links.length, "Incorrect index parsed from the message: " + this.props.message);
                if (index >= 0 && index < this.props.links.length) {
                    const link = this.props.links[index];
                    const role = link.role || (link.action ? "button" : "link");
                    return <a ref={(e) => this._refs[index] = e} key={idx} href={link.href || null} role={role} onClick={link.action} onKeyDown={link.onKeyDown} target={link.target} tabIndex={-1}>{link.text}</a>;
                }
            }

            return <span key={idx}>{segment}</span>;
        });

        return <span>
            {children}
        </span>;
    }
}
