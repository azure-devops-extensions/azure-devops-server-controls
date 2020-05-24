import "VSS/LoaderPlugins/Css!fabric";

import * as React from "react";
import { caseInsensitiveContains, startsWith, localeIgnoreCaseComparer } from "VSS/Utils/String";
import { delay } from "VSS/Utils/Core";

import { WorkItemControlComponent, IWorkItemControlProps } from "WorkItemTracking/Scripts/Form/React/Components/WorkItemControlComponent";
import { IItem, IDataSource, IPickerProps, Picker, PickerMode } from "WorkItemTracking/Scripts/Form/React/Components/Picker";
import { TreeList, ITreeListProps } from "VSSPreview/Controls/TreeList";
import { ScrollToMode } from "OfficeFabric/List";
import { PartialHighlightComponent } from "VSSPreview/Controls/PartialHighlightComponent";
import * as TreeUtils from "VSS/Utils/Tree";

import * as WITOM from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { INode } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { autobind } from "OfficeFabric/Utilities";

export interface IClassificationItem extends IItem {
    key: string;
    parentKey: string;

    label: string;

    expanded?: boolean;
    level: number;
    childrenCount: number;
}

export class ClassificationDataSource implements IDataSource<IClassificationItem> {
    private _tree: INode;
    private _items: IClassificationItem[];

    private _filter: string;
    private _filteredItems: IClassificationItem[];

    private _previousFilter: string;
    private _previousFilterResult: TreeUtils.IFilterResult;

    constructor(private workItem: WITOM.WorkItem, private field: WITOM.Field) {
    }

    public getItems(): IPromise<IClassificationItem[]> | IClassificationItem[] {
        if (this._items) {
            return this._getItems();
        }

        return this.workItem.project.nodesCacheManager.beginGetNodes().then(() => {
            if (this.field.fieldDefinition.referenceName === CoreFieldRefNames.IterationPath) {
                this._tree = this.workItem.project.nodesCacheManager.getIterationNode(true);
            } else {
                this._tree = this.workItem.project.nodesCacheManager.getAreaNode(true);
            }

            // Flatten tree to list
            let items: IClassificationItem[] = [];
            let pathMap: IDictionaryStringTo<string> = {};
            const separator = "\\";
            TreeUtils.traversePreOrder(this._tree, node => node.children, (node, parentNode, level, childrenCount) => {
                const parentKey = parentNode && parentNode.guid;

                // Build path from node to root
                let path = node.name;
                if (parentKey) {
                    const parentPath = pathMap[parentKey];
                    if (parentPath) {
                        path = parentPath + separator + path;
                    }
                }

                // Store path for potential children lookup
                pathMap[node.guid] = path;

                items.push({
                    parentKey: parentKey,
                    key: node.guid,
                    value: path,
                    label: node.name,

                    level: level,
                    childrenCount: childrenCount,
                    expanded: true
                });
            });

            this._items = items;
            return this._getItems();
        });
    }

    private _getItems(): IClassificationItem[] {
        if (this._filter) {
            const isRefinement = this._previousFilter && startsWith(this._filter, this._previousFilter, localeIgnoreCaseComparer);
            if (isRefinement) {
                if (localeIgnoreCaseComparer(this._filter, this._previousFilter) === 0) {
                    // Filter has not changed, return previous result
                    return this._filteredItems;
                }
            } else {
                // Do not reuse previous filter result, clear temporary values
                this._previousFilter = null;
                this._previousFilterResult = null;
                this._filteredItems = null;
            }

            const filterResult = TreeUtils.filterTree(
                this._tree,
                node => caseInsensitiveContains(node.name, this._filter),
                node => node.guid,
                node => node.children,
                this._previousFilterResult);

            let sourceItems = this._items;
            if (isRefinement) {
                sourceItems = this._filteredItems;
            }

            this._filteredItems = sourceItems.filter(item => !!filterResult[item.key]).map(item => ({
                key: item.key,
                parentKey: item.parentKey,
                value: item.value,
                label: item.label,
                level: item.level,
                childrenCount: item.childrenCount,
                expanded: filterResult[item.key].hasMatchingDescendant // Expand if a child is matching
            }));

            this._previousFilter = this._filter;
            this._previousFilterResult = filterResult;

            return this._filteredItems;
        }

        return this._items;
    }

    public getFilter(): string {
        return this._filter;
    }

    public setFilter(text: string): void {
        this._filter = text;
    }

    public clearFilter(): void {
        this._filter = null;
    }
}

export interface IWorkItemClassificationComponentProps extends IWorkItemControlProps {
    onValueSelected?: Function;
}

export interface IWorkItemClassificationComponentState {
    dataSource: ClassificationDataSource;
    field: WITOM.Field;
}

// Height of a single rendered item in px, see mseng work item: #862570
const itemHeightInPx = 45;

export class WorkItemClassificationComponent extends WorkItemControlComponent<IWorkItemClassificationComponentProps, IWorkItemClassificationComponentState> {
    private _treeList: TreeList<IClassificationItem>;

    constructor(props: IWorkItemControlProps, context: any) {
        super(props, context);

        this.state = {
            dataSource: null,
            field: null
        };
    }

    public render(): JSX.Element {
        if (this.state.dataSource) {
            return React.createElement<IPickerProps<IClassificationItem, ClassificationDataSource>>(Picker, {
                className: "field-control-picker",
                dataSource: this.state.dataSource,
                selectedValue: this.state.field.getValue(),
                onSelect: this._onSelect,
                pickerMode: PickerMode.Filter,
                onRenderList: this._renderList,
                onScrollToIndex: this._scrollToIndex,
                inputClassName: "field-control-input",
                inputAriaLabel: this.props.controlOptions.ariaLabel,
                itemHeight: itemHeightInPx
            });
        }

        return null;
    }

    @autobind
    private _renderItemContent(item: IClassificationItem, renderActions: (item: IClassificationItem) => JSX.Element, filter?: string): JSX.Element {
        return <div className="picker-item">
            <div className="picker-content">
                <PartialHighlightComponent text={item.label} highlight={filter} />
            </div>
            {renderActions(item)}
        </div>;
    }

    @autobind
    private _renderList(items: IClassificationItem[], defaultRenderList: () => JSX.Element, renderActions: (item: IClassificationItem) => JSX.Element, filter?: string) {
        return React.createElement(TreeList as React.ComponentClass<ITreeListProps<IClassificationItem>>, {
            items: items,
            onRenderItemContent: (item: IClassificationItem) => this._renderItemContent(item, renderActions, filter),
            itemWrapperClassName: "field-control-item",
            itemHeight: itemHeightInPx,
            onItemSelect: this._onSelect,
            ref: this._resolveTreeList,
            selectedValue: this.state.field.getValue()
        });
    }

    @autobind
    private _resolveTreeList(treeList: TreeList<IClassificationItem>): void {
        this._treeList = treeList;
    }

    @autobind
    private _scrollToIndex(index: number): void {
        if (this._treeList) {
            this._treeList.scrollToIndex(index, ScrollToMode.center);
        }
    }

    @autobind
    private _onSelect(item: IClassificationItem) {
        this.state.field.setValue(item.value);

        // Re-render
        this.forceUpdate();

        if (this.props.onValueSelected) {
            // Wait for animation to finish, then call callback
            delay(null, 450, () => this.props.onValueSelected());
        }
    }

    protected _bind(workItem: WITOM.WorkItem, isDisabledView?: boolean) {
        super._bind(workItem, isDisabledView);

        const field = workItem.getField(this.props.controlOptions.fieldName);
        const dataSource = new ClassificationDataSource(this._formContext.workItem, field);

        this.setState({
            field,
            dataSource
        });
    }
}
