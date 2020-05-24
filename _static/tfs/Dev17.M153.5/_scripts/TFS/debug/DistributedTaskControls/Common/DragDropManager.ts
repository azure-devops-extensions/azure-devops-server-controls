import * as React from "react";

import { Singleton } from "DistributedTaskControls/Common/Factory";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { DraggedOverRegion, IDragDropData, IInsertListItemData } from "DistributedTaskControls/Common/Types";

import * as Utils_String from "VSS/Utils/String";
import { BrowserCheckUtils } from "VSS/Utils/UI";

export const LocationLineTopClassName = "location-line-top";
export const LocationLineBottomClassName = "location-line-bottom";

// the max offset of the target to determine if scrolling should be performed
export const ScrollTolerance = 20;

export enum DropStatus {
    // default
    None,
    // data was not accepted
    Rejected,
    // data was accepted
    Accepted,
    // drag drop action failed
    Failed
}

export class DragDropManager extends Singleton {

    public static instance(): DragDropManager {
        return super.getInstance<DragDropManager>(DragDropManager);
    }

    public static dispose(): void {
        this.instance()._dropAbove = false;
        this.instance()._insertMap = null;
        this.instance()._removeMap = null;
        this.instance()._sourceData = null;
        this.instance()._targetData = null;
        return super.dispose();
    }

    public registerInsertCallback(id: string, callback: (insertData: IInsertListItemData) => void): void {
        if (!this._insertMap) {
            this._insertMap = {};
        }
        this._insertMap[id.toLowerCase()] = callback;
    }

    public registerRemoveCallback(id: string, callback: (data: any) => void): void {
        if (!this._removeMap) {
            this._removeMap = {};
        }
        this._removeMap[id.toLowerCase()] = callback;
    }

    public unregisterInsertCallback(id: string): void {
        if (this._insertMap) {
            delete this._insertMap[id.toLowerCase()];
        }
    }

    public unregisterRemoveCallback(id: string): void {
        if (this._removeMap) {
            delete this._removeMap[id.toLowerCase()];
        }
    }

    public getSource(): IDragDropData {
        return this._sourceData;
    }

    public setSource(data: IDragDropData): void {
        this._sourceData = data;
    }

    public getTarget(): IDragDropData {
        return this._targetData;
    }

    public setTarget(data: IDragDropData, dropAbove: boolean): void {
        this._targetData = data;
        this._dropAbove = dropAbove;
    }

    public isCopyAction(): boolean {
        return this._isCopyAction;
    }

    public executeDragDrop(): void {
        if (!this._insertMap || !this._removeMap || !this._targetData || !this._sourceData) {
            this._sourceData = null;
            this._targetData = null;
            this._dropAbove = false;
            // drop should be marked as failed only if the data was accepted but failed due to some other reason
            this._dropStatus = (this._dropStatus === DropStatus.Accepted) ? DropStatus.Failed : this._dropStatus;
            return;
        }

        let insertData: IInsertListItemData = null;
        if (this._isCopyAction) {
            // create copy of source data and insert in new
            // the insert callback is supposed to handle creation of copy
            insertData = {
                sourceItem: this._sourceData,
                targetItem: this._targetData,
                shouldInsertBefore: this._dropAbove,
                shouldInsertCopy: true
            };
            this._insertMap[this._targetData.listId.toLowerCase()](insertData);
        }
        else if (this._sourceData.key !== this._targetData.key) {
            // perform drag drop only if source is different from target

            // remove from original
            if (this._removeMap[this._sourceData.listId.toLowerCase()]) {
                this._removeMap[this._sourceData.listId.toLowerCase()](this._sourceData.data);
            }

            // insert in new
            if (this._insertMap[this._targetData.listId.toLowerCase()]) {
                insertData = {
                    sourceItem: this._sourceData,
                    targetItem: this._targetData,
                    shouldInsertBefore: this._dropAbove,
                    shouldInsertCopy: false
                };
                this._insertMap[this._targetData.listId.toLowerCase()](insertData);
            }
        }

        this._sourceData = null;
        this._targetData = null;
        this._dropAbove = false;
        this._isCopyAction = false;
    }

    public onDragStart(e: React.DragEvent<HTMLDivElement>, data: IDragDropData, isCopy?: boolean, allowedEffect?: string) {
        this._dropStatus = DropStatus.None;
        if (e.dataTransfer) {
            // Firefox require manually setting data when drag start for elements to be dragged.
            // http://stackoverflow.com/questions/19055264/why-doesnt-html5-drag-and-drop-work-in-firefox
            e.dataTransfer.setData("text", Utils_String.empty);

            e.dataTransfer.effectAllowed = allowedEffect ? allowedEffect : "copymove";
        }

        this._isCopyAction = isCopy;
        this.setSource(data);
    }

    public onDragOver(e: React.DragEvent<HTMLDivElement>, canAccept: (IDragDropData, boolean) => boolean) {
        this._allowParentScroll = true;
        this._scrollIfNeeded(e);
        if (canAccept(this.getSource(), this._isCopyAction)) {
            // This event has to be cancelled for "drop" event to be raised.
            // https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Drag_operations#droptargets
            this._stop(e);
            this._setDropEffect(e);
            this._setDraggedOverRegionIndicator(e.currentTarget,
                this._getDraggedOverRegion(e));
        }
        else {
            this._setDraggedOverRegionIndicator(e.currentTarget, DraggedOverRegion.None);
        }
    }

    public onDragLeave(e: React.DragEvent<HTMLDivElement>, canAccept: (IDragDropData, boolean) => boolean) {
        if (canAccept(this.getSource(), this._isCopyAction)) {
            this._stop(e);
            this._setDraggedOverRegionIndicator(e.currentTarget, DraggedOverRegion.None);
        }
        else {
            this._setDraggedOverRegionIndicator(e.currentTarget, DraggedOverRegion.None);
        }
    }

    public onDrop(e: React.DragEvent<HTMLDivElement>, data: IDragDropData, canAccept: (IDragDropData, boolean) => boolean) {
        this._allowParentScroll = false;
        if (canAccept(this.getSource(), (this._isCopyAction || e.ctrlKey))) {
            this._stop(e);
            this._isCopyAction = this._isCopyAction || e.ctrlKey;
            this._setDropEffect(e);
            let draggedOverRegion = this._getDraggedOverRegion(e);
            this.setTarget(
                data,
                (draggedOverRegion === DraggedOverRegion.Top)
            );
            this._setDraggedOverRegionIndicator(e.currentTarget, DraggedOverRegion.None);
            this._dropStatus = DropStatus.Accepted;
        }
        else {
            this._setDraggedOverRegionIndicator(e.currentTarget, DraggedOverRegion.None);
        }
        this._dropStatus = DropStatus.Rejected;
    }

    public onDragEnd(e: React.DragEvent<HTMLDivElement>): DropStatus {
        this.executeDragDrop();
        return this._dropStatus;
    }

    private _stop(e: React.DragEvent<HTMLDivElement>): void {
        e.preventDefault();
        e.stopPropagation();
    }

    private _setDraggedOverRegionIndicator(target: HTMLDivElement, region: DraggedOverRegion) {
        // add class based on region
        switch (region) {
            case DraggedOverRegion.Top:
                target.classList.remove(LocationLineBottomClassName);
                this._addClassToTarget(target, LocationLineTopClassName);
                break;
            case DraggedOverRegion.Bottom:
                target.classList.remove(LocationLineTopClassName);
                this._addClassToTarget(target, LocationLineBottomClassName);
                break;
            default:
                this._clearDragOverClasses(target);
                break;
        }
    }

    private _addClassToTarget(target: HTMLDivElement, className: string) {
        if (!target.classList.contains(className)) {
            target.classList.add(className);
        }
    }

    private _clearDragOverClasses(target: HTMLDivElement) {
        target.classList.remove(LocationLineTopClassName);
        target.classList.remove(LocationLineBottomClassName);
    }

    private _getDraggedOverRegion(e: React.DragEvent<HTMLDivElement>): DraggedOverRegion {
        let draggedOverRegion = DraggedOverRegion.Bottom; // drop region will be bottom by default

        if (!isNaN(e.clientY) && e.currentTarget) {
            let currentTargetBounds = (e.currentTarget as HTMLElement).getBoundingClientRect();
            draggedOverRegion = e.clientY - currentTargetBounds.top > currentTargetBounds.height / 2
                ? DraggedOverRegion.Bottom
                : DraggedOverRegion.Top;
        }

        return draggedOverRegion;
    }

    private _setDropEffect(event: React.DragEvent<HTMLDivElement>): void {
        let dataTransfer = event.dataTransfer;
        if (dataTransfer) {
            const dropEffect: string = (event.ctrlKey || this._isCopyAction) ? "copy" : "move";
            try {
                /* Safari Browser dependent case, Safari only responds to "all" */
                if (BrowserCheckUtils.isSafari() && dropEffect === "copy") {
                    dataTransfer.dropEffect = "all";
                } else {
                    dataTransfer.dropEffect = dropEffect;
                }
            }
            catch (err) {
                // In Edge and IE, assigning dataTransfer.dropEffect throws exception
            }
        }
    }

    private _scrollIfNeeded(e: React.DragEvent<HTMLDivElement>) {
        // use custom scrolling only for ie
        if (BrowserCheckUtils.isIE() && e.currentTarget) {
            let currentTargetBounds = (e.currentTarget as HTMLElement).getBoundingClientRect();
            let currentTargetParentBounds = (e.currentTarget.offsetParent as HTMLElement).getBoundingClientRect();

            if (this._allowParentScroll) {
                if ((currentTargetBounds.top - currentTargetParentBounds.top) < ScrollTolerance) {
                    this._scroll(-1, e.currentTarget.offsetParent);
                }
                else if ((currentTargetParentBounds.bottom - currentTargetBounds.bottom) < ScrollTolerance) {
                    this._scroll(1, e.currentTarget.offsetParent);
                }
                else {
                    this._allowParentScroll = false;
                }
            }
        }
    }

    private _scroll(step: number, containerElement: Element) {
        this._isCustomScrollingPerformed = true;
        let $scrollableContainer = $(containerElement);
        let scrollY = $scrollableContainer.scrollTop();
        $scrollableContainer.scrollTop(scrollY + step);
        if (this._allowParentScroll) {
            setTimeout(() => { this._scroll(step, containerElement); }, 20);
        }
    }

    // this function is only for unit testing
    public isCustomScrollingPerformed(): boolean {
        return this._isCustomScrollingPerformed;
    }

    private _insertMap: IDictionaryStringTo<(insertData: IInsertListItemData) => void>;
    private _removeMap: IDictionaryStringTo<(data: any) => void>;
    private _sourceData: IDragDropData;
    private _targetData: IDragDropData;
    private _dropAbove: boolean;
    private _isCopyAction: boolean;
    private _dropStatus: DropStatus;
    private _allowParentScroll: boolean;
    private _isCustomScrollingPerformed: boolean = false;
}