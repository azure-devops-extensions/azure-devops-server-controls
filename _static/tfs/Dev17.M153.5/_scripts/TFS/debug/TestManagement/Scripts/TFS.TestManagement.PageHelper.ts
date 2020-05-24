import Diag = require("VSS/Diag");
import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");

export class PageHelper {

    constructor(Ids: number[], initPageSize?: number, pageSize?: number) {
        this._objectIds = Ids;
        this._initPageSize = initPageSize || 25;
        this._pageSize = pageSize || 10;
        this._pageIndex = 0;
        if (this._objectIds.length < this._initPageSize) {
            this._pageCount = 1;
        }
        else {
            // 1 for the initial page + Remaining tests divided in to pages of size _pageSize.
            this._pageCount = 1 + Math.ceil((Ids.length - this._initPageSize) / this._pageSize);
        }
    }

    public setStartingPage(page: number) {
        this._pageIndex = page;
    }

    public getPageCount() {
        return this._pageCount;
    }

    public getPageIndex() {
        return this._pageIndex;
    }

    public canPage(): boolean {
        if (this._pageIndex >= this._pageCount) {
            // All the data has been fetched.
            return false;
        }
        else {
            return true;
        }
    }

    public getIdsToFetch(): number[] {
        let idsToFetch: number[] = [],
            startIndex: number,
            endIndex: number;

        Diag.logVerbose("[PageHelper]Fetching page " + this._pageIndex + " of " + this._pageCount);
        if (this._pageIndex === 0) {
            startIndex = 0;
            endIndex = this._initPageSize;
        }
        else {
            startIndex = this._initPageSize + (this._pageIndex - 1) * this._pageSize;
            endIndex = startIndex + this._pageSize;
        }

        Diag.logVerbose("[PageHelper]startIndex = " + startIndex + " endIndex = " + endIndex + " fetching " + idsToFetch.length + " test cases");
        idsToFetch = (this._pageIndex === this._pageCount - 1) ? this._objectIds.slice(startIndex) : this._objectIds.slice(startIndex, endIndex);
        return idsToFetch;
    }

    public pageFetchComplete(): void {
        this._pageIndex++;
    }

    public static getPageSize(): number {
        return defaultPageSize;
    }

    private _pageSize: number;
    private _initPageSize: number;
    private _pageCount: number;
    private _pageIndex: number;
    private _objectIds: number[];
}

export let defaultPageSize: number = TestsOM.PageConstants.defaultPageSize;