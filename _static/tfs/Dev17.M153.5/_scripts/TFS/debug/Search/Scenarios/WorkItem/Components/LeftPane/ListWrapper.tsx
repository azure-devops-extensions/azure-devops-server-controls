import * as React from "react";
import * as List from "OfficeFabric/List";
import { css } from "OfficeFabric/Utilities";
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { WorkItemResult } from "Search/Scenarios/WebApi/Workitem.Contracts";
import { TitleSection } from "Search/Scenarios/WorkItem/Components/LeftPane/TitleSection";
import { MetadataSection } from "Search/Scenarios/WorkItem/Components/LeftPane/MetadataSection";
import { SnippetSection } from "Search/Scenarios/WorkItem/Components/LeftPane/SnippetSection";
import { HighlightFragment } from "Search/Scenarios/WorkItem/Flux/Stores/SnippetFragmentCache";
import { ResultsViewConstants } from "Search/Scenarios/WorkItem/Constants";
import { ColorsDataPayload } from "Search/Scenarios/WorkItem/Flux/ActionsHub";

export interface ListWrapperProps extends List.IListProps {
    currentItemIndex: number;

    idWidth: number;

    colorsData: ColorsDataPayload;

    onDidUpdate(): void;

    getFragments(key: string): IDictionaryStringTo<HighlightFragment>;

    setFragments(key: string, value: IDictionaryStringTo<HighlightFragment>): void;

    changeActiveItem(item: WorkItemResult): void;
    
    onWorkItemInvoked(workItemId: string, url:string, openInNewTab: boolean): void;
}

export class ListWrapper extends React.Component<ListWrapperProps, {}> {
    private listRef: List.List;
    private currentItemRow: ItemRow;
    private currentItemIndex: number;

    constructor(props: ListWrapperProps) {
        super(props);
        this.currentItemIndex = props.currentItemIndex;
    }

    public render(): JSX.Element {
        const { idWidth, colorsData, getFragments, setFragments } = this.props;
        const getCellRenderer = (item: WorkItemResult, index: number): JSX.Element =>
            < ItemRow
                item={item}
                index={index}
                currentItemIndex={this.currentItemIndex}
                idWidth={idWidth}
                colorsData={colorsData}
                onActivation={this.onItemActivation}
                setActiveItem={this.setActiveItem}
                getFragments={getFragments}
                setFragments={setFragments}
                onWorkItemInvoked={this.props.onWorkItemInvoked} />;
        return (
            <FocusZone
                className="itemList-focus-zone"
                direction={FocusZoneDirection.vertical}
                isInnerZoneKeystroke={(evt?: React.KeyboardEvent<HTMLElement>) =>
                    evt.keyCode === 39 /* right */ || evt.keyCode === 37 /* left */}>
                <List.List
                    {...this.props}
                    ref={list => this.listRef = list}
                    onRenderCell={getCellRenderer} />
            </FocusZone>
        );
    }

    public componentDidMount(): void {
        this.postRender();
    }

    public componentDidUpdate(): void {
        this.postRender();
    }

    public componentWillReceiveProps(nextProps: ListWrapperProps): void {
        if (nextProps.currentItemIndex !== this.currentItemIndex) {
            this.currentItemIndex = nextProps.currentItemIndex;
        }
    }

    private postRender(): void {
        // Even though onRenderCell has changed, owing to no changes in "items", list cell won't update on their own. 
        // For new changes to take effect we have to call forceUpdate on list explicitly.
        if (this.listRef) {
            this.listRef.forceUpdate();
            this.listRef.scrollToIndex(this.currentItemIndex);
        }

        this.props.onDidUpdate();
    }

    private onItemActivation = (itemRow: ItemRow, item: WorkItemResult, index: number): void => {
        if (this.currentItemRow !== itemRow) {
            if (this.currentItemRow) {
                this.currentItemRow.changeActiveState(false);
            }

            itemRow.changeActiveState(true);
            this.setActiveItem(itemRow, index);
        }

        this.props.changeActiveItem(item);
    }

    private setActiveItem = (itemRow: ItemRow, index: number): void => {
        this.currentItemRow = itemRow;
        this.currentItemIndex = index;
    }
}

interface ItemRowProps {
    item: WorkItemResult;

    currentItemIndex: number;

    index: number;

    idWidth: number;

    colorsData: ColorsDataPayload;

    onActivation(itemRow: ItemRow, item: WorkItemResult, index: number): void;

    setActiveItem(itemRow: ItemRow, index: number): void;

    getFragments(key: string): IDictionaryStringTo<HighlightFragment>;

    setFragments(key: string, value: IDictionaryStringTo<HighlightFragment>): void;

    onWorkItemInvoked(workItemId: string, url: string, openInNewTab: boolean): void;
}

interface ItemRowState {
    isActive: boolean;
}

class ItemRow extends React.Component<ItemRowProps, ItemRowState>{
    constructor(props: ItemRowProps) {
        super(props);
        this.state = { isActive: props.index === props.currentItemIndex };
    }

    public render(): JSX.Element {
        const { item, idWidth, colorsData, getFragments, setFragments, onActivation, index, onWorkItemInvoked } = this.props;
        const aggregatedHits: IDictionaryStringTo<HighlightFragment> = {};
        // Calculating width for the work item ID by giving each digit 8px size and a buffer of 3px
        const idWidthCalculated = (idWidth * ResultsViewConstants.WidthForEachDigit) + ResultsViewConstants.BufferWidthForWorkItemId;

        item.hits.forEach((hit) => {
            aggregatedHits[hit.fieldReferenceName] ?
                aggregatedHits[hit.fieldReferenceName].highlights.concat(hit.highlights) :
                aggregatedHits[hit.fieldReferenceName] = {
                    fieldName: hit.fieldName,
                    highlights: hit.highlights
                };
        });

        return (
            <div className={css("search-workitem-snippet-outerdiv", { "is-active": this.state.isActive })}
                data-is-focusable={true}
                onFocus={() => onActivation(this, item, index)}>
                <div className="search-workitem-snippet-maindiv">
                    <TitleSection
                        item={item}
                        aggregatedHits={aggregatedHits}
                        idWidth={idWidthCalculated}
                        onWorkItemInvoked={onWorkItemInvoked} />
                    <MetadataSection
                        item={item}
                        colorsData={colorsData}
                        aggregatedHits={aggregatedHits} />
                    <SnippetSection
                        item={item}
                        aggregatedHits={aggregatedHits}
                        getFragments={getFragments}
                        setFragments={setFragments} />
                </div>
            </div>
        );
    }

    public componentDidMount(): void {
        this.postRender(this.props);
    }

    public componentWillReceiveProps(nextProps: ItemRowProps): void {
        this.postRender(nextProps);
    }

    public changeActiveState = (isActive: boolean): void => {
        this.setState({ isActive: isActive });
    }

    private postRender = (props: ItemRowProps): void => {
        const { index, currentItemIndex, setActiveItem } = props;
        if (index === currentItemIndex) {
            setActiveItem(this, index);
            this.changeActiveState(true);
        }
        else {
            this.changeActiveState(false);
        }
    }
}