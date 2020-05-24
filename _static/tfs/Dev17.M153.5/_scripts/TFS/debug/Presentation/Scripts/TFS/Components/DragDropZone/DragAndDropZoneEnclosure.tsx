/// <reference types="react" />
/// <reference types="react-dom" />
///<amd-dependency path="jQueryUI/effect"/>
///<amd-dependency path="jQueryUI/sortable"/>
/// <reference types="jqueryui" />

import * as React from "react";
import { DragDropContext } from "Presentation/Scripts/TFS/Components/DragDropZone/DragDropContext";

export interface IDragAndDropZoneEnclosureProps {

    /**
     * What: Unique identifier for the enclosure. Can be a string, a number, a guid. The importance is to have a unique data for the page.
     *       Used as the IDContext which every children (DragZone and DropZone) must share.
     * Why: Allows to have multiple enclosure in the same page
     */
    idContext: string;

    /**
     * What: Marks the possible drop zone target of a drag zone
     * Why: Indicates every potential place where we can drop a drag zone. Works with "type" of zone
     */
    showPossibleDropOnDragStart: boolean;

    /**
     * What: Marks over the possible drop zone (see configuration "showPossibleDropOnDragStart") that we allow to drop.
     * Why: Indicates to the user clearly where the item will be placed
     */
    showPlaceHolderOnHover: boolean;

    /**
     * What: Class to add to the enclosure. It can be one or more separated by space.
     * Why: Allows to apply different style per enclosure for Dropzone (children) and Dragzone (children).
     */
    className?: string;

    /**
     * What: When using the drag and drop with delay, this is the value to wait before the drag start
     * Why: We need the timer and CSS animation to share the same delay
     */
    delayInMsBeforeDrag?: number;

    /**
     * What: If drag and drop should be disabled for this enclosure
     * Why: Some scenarios (user does not have permsissions for example) we don't want the user to be able to drag/drop anything
     */
    disabled?: boolean;
}

/**
 * What: This is the main component that must be at the higher level possible to wrap all DropZone and DragZone.
 * Why: Creates a sandbox for the dragging and configure shared configuration for its DropZones. To do so, it uses at this moment
 *      the existing concept of the DragDropContext
 */
export class DragAndDropZoneEnclosure extends React.Component<IDragAndDropZoneEnclosureProps, {}> {    
    /**
     * What: CSS Class used to mark the enclosure on the DOM.
     * Why: 1- Allows to have specific style for zone per enclosure if needed
     *      2- Allows to have JQuery UI to block dragging outside the enclosure
     */
    private static ENCLOSURE_CLASS = "drag-and-drop-enclosure";

    constructor(props: IDragAndDropZoneEnclosureProps) {
        super(props);
        DragDropContext.getInstance(this.props.idContext).enclosureDomSelector = "." + DragAndDropZoneEnclosure.getUniqueClassName(props.idContext); // Need to be before mount since it will be used by DropZone didMount
        DragDropContext.getInstance(this.props.idContext).disabled = props.disabled;
    }

    public render(): JSX.Element {
        const uniqueIdentifier = this.props.idContext;
        const className = DragAndDropZoneEnclosure.getUniqueClassName(this.props.idContext) + " " + (this.props.className || "");
        return <div
            id={uniqueIdentifier}
            className={className}>
            {this.props.children}
        </div>;
    }

    /**
     * What: Get one class that is unique for the enclosure. It use the idContext to create the class name.
     * Why: Allow to style the control differently if we have multiple enclosure on a page
     */
    public static getUniqueClassName(idContext: string): string {
        return DragAndDropZoneEnclosure.ENCLOSURE_CLASS + "_" + idContext;
    }

    public componentDidMount(): void {
        if (this.props.delayInMsBeforeDrag) {
            DragDropContext.getInstance(this.props.idContext).delayIsMsBeforeDrag = this.props.delayInMsBeforeDrag;
        }
        DragDropContext.getInstance(this.props.idContext).showPlaceHolderOnHover = this.props.showPlaceHolderOnHover;
        DragDropContext.getInstance(this.props.idContext).showPossibleDropOnDragStart = this.props.showPossibleDropOnDragStart;
    }

    public componentWillUnmount() {
        DragDropContext.getInstance(this.props.idContext).reset();
    }
}