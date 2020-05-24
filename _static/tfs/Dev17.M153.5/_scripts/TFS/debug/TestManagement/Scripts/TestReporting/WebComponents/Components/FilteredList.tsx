/// <reference types="react" />

import * as q from "q";
import * as React from "react";

import * as TFS_React from "Presentation/Scripts/TFS/TFS.React";
import * as FilteredListControl from "Presentation/Scripts/TFS/FeatureRef/FilteredListControl";
import * as FilteredListDropDownMenu from "Presentation/Scripts/TFS/FeatureRef/FilteredListDropdownMenu";

import { IItem } from "TestManagement/Scripts/TestReporting/Common/Common";

import * as Controls from "VSS/Controls";
import { delegate as Delegate } from "VSS/Utils/Core";
import { PopupContentControl } from "VSS/Controls/PopupContent";

export interface IFilteredListProps extends TFS_React.ITfsComponentProps {
    listName: string;
    onSelectionChanged: (selectedElement: IItem) => void;
    getItemList: () => IPromise<IItem[]>;
}

export interface IFilteredListState extends TFS_React.ITfsComponentState {
    listLoadComplete: boolean;
}

export class FilteredList extends TFS_React.TfsComponent<IFilteredListProps, IFilteredListState> {

    public componentWillMount(): void {
        this._initializeOptions();
        this._initialize();
    }

    protected onRender(element: HTMLElement) {
        if (!this._filteredListControl) {
            let $container = $("<div />");
            this._filteredListControl = Controls.Enhancement.enhance(PopupContentControl, $(element)[0], {
                cssClass: "filtered-list-popup",
                elementAlign: "right-top",
                supportScroll: true,
                menuContainer: $(element).parent(),
                content: () => {
                    this._filteredList = Controls.Control.create(FilteredListControl.FilteredListControl, $container, this._options);
                    $container.bind("selected-item-changed", Delegate(this, this._onItemSelected));
                    $container.bind("escape-key-pressed", () => {
                        this._filteredListControl.hide();
                        // on escape press taking back focus on dropdown icon
                        $(".result-history-view .filter-btn.right .popup-menu-trigger")[0].focus();
                    });
                    return $container;
                }
            }) as PopupContentControl;
        }

        this._filteredListControl.show();
        this._filteredList.setFocus();

    }

    private _onItemSelected(e?: any, args?: any): void {
        if (args) {
            let selectedItem: IItem = this._itemList.filter((item: IItem) => {
                return (item.name === args.selectedItem);
            })[0];
            this.props.onSelectionChanged(selectedItem);
            this._filteredListControl.hide();
        }
    }

    private _initializeOptions(): void {
        this._options = {
            useBowtieStyle: true,
            scrollToExactMatch: true,
            maxMenuItems: FilteredList.MAX_MENU_ITEMS_COUNT,
            waitOnFetchedItems: true,
            waterMark: "Filter branches",
            beginGetListItems: (tabId: string, callBack: (items: any[]) => void) => {
                this.props.getItemList().then((elements: IItem[]) => {
                    this._itemList = elements;
                    callBack(elements.map((element: IItem) => {
                        return element.name;
                    }));
                });
            }
        } as FilteredListControl.FilteredListControlOptions;
    }

    private _initialize(): void {
        this.state = {
            listLoadComplete: false
        } as IFilteredListState;
    }

    private static MAX_MENU_ITEMS_COUNT = 10;

    private _itemList: IItem[];
    private _options: any;
    private _filteredListControl: PopupContentControl;
    private _filteredList: FilteredListControl.FilteredListControl;
}
