import { ICalloutProps } from "OfficeFabric/Callout";
import { Link } from "OfficeFabric/Link";
import { TooltipOverflowMode } from "VSSUI/Tooltip";
import { css } from "OfficeFabric/Utilities";
import * as React from "react";

import { HighlightableSpan } from "Presentation/Scripts/TFS/Components/HighlightableSpan";
import { ControlledTooltipHost } from "Presentation/Scripts/TFS/Components/Tree/ControlledTooltipHost";

import "VSS/LoaderPlugins/Css!Presentation/Components/Tree/TreeCell";

export interface TreeCellProps {
    className?: string;
    name: string;
    title?: string;
    iconClass: string;
    iconUrl?: string;
    fileUrl?: string;
    isDirty?: boolean;
    isDelete?: boolean;
    highlightText?: string;
    isFocused?: boolean;
    decorators?: JSX.Element[];
}

const calloutProps: ICalloutProps = { className: "vc-tree-cell-callout", isBeakVisible: false };

export const TreeCell = (props: TreeCellProps): JSX.Element => {
    return (
        <ControlledTooltipHost
            className={css("vc-tree-cell", props.className)}
            aria-label={props.name}
            overflowMode={props.title ? undefined : TooltipOverflowMode.Self}
            tooltipProps={{ style: { overflowY: "auto" } }}
            content={props.title || props.name}
            isFocused={props.isFocused}
            calloutProps={calloutProps}
            hasLongDelay={true}
        >
            {
                props.iconUrl
                ? <span className={"type-icon"}><img className={props.iconClass} src={props.iconUrl} alt={""} /></span>
                : <span className={"type-icon bowtie-icon " + props.iconClass} />
            }
            {
                props.fileUrl
                ? <Link className="file-name" href={props.fileUrl}>
                    {getDecoratedName(props)}
                </Link>
                : <span className="file-name">
                    {getDecoratedName(props)}
                </span>
            }
            {props.decorators}
        </ControlledTooltipHost>);
};

function renderNameDirty(renderText: string, props: TreeCellProps): string {
    return props.isDirty ? renderText + " *" : renderText;
}

function renderNameDelete(renderText: string | JSX.Element, props: TreeCellProps): string | JSX.Element {
    return props.isDelete
        ? <span className={css({ "deleted-item": props.isDelete })}> {renderText} </span>
        : renderText;
}

function renderNameHighlightable(renderText: string, props: TreeCellProps): string | JSX.Element {
    return props.highlightText
        ? <HighlightableSpan className="tree-cell-highlighted-span" text={renderText} highlight={props.highlightText} />
        : renderText;
}

function getDecoratedName(props: TreeCellProps): React.ReactNode {
    return renderNameDelete(renderNameHighlightable(renderNameDirty(props.name, props), props), props);
}