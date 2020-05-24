import * as Action_Base from "VSS/Flux/Action";
import * as React from "react";
import * as ZeroData from "Presentation/Scripts/TFS/Components/ZeroData";

export interface IHubItem {
    isMatch(query: string): boolean;
    getId(): string;
    isDisabled?: () => boolean;
}

export interface IHubCell {
    content: JSX.Element;
    className?: string;
}

export enum ColumnType {
    IconName,
    Project,
    Path
}

export interface IHubGroupColumn<T extends IHubItem> {
    createCell(item: T): IHubCell;
    minWidth?: number;
    maxWidth?: number;
    className?: string;
    type?: ColumnType;
}

export class HubItemGroup<T extends IHubItem> {
    id: string;
    title: string;
    isLoading: boolean;
    items: T[];
    columns: IHubGroupColumn<T>[];
    alert?: JSX.Element;
    toolbarProps?: IToolbarComponentProps;
    headerIndex: string;
    isFirstGroup?: boolean;
    isSecondGroup?: boolean;
    isSecondToLastGroup?: boolean;
    isLastGroup?: boolean;

    constructor(id: string, title: string, items: T[], columns: IHubGroupColumn<T>[]) {
        this.id = id;
        this.title = title;
        this.items = items;
        this.columns = columns;
    }

    filter(filterText: string): HubItemGroup<T> {
        return new HubItemGroup<T>(
            this.id,
            this.title,
            this.items.filter(item => item.isMatch(filterText)),
            this.columns
        );
    }
}

export interface IToolbarComponentProps {
    handleReorderEvent(direction: Direction): void;
    headerButtonIndex: string;
    showUp: boolean;
    showDown: boolean;
    lastGroupPosition: boolean;
}

export interface ICollectionItem {
    name: string;
    id: string;
}

export interface ICollectionUrlItem {
    id: string;
    url: string;
}

export interface IOrganizationInfo {
    organizationName: string;
    organizationUrl: string;
}

export interface IOrgCollectionsPickerProps {
    collections: ICollectionItem[];
    searchBoxAriaLabel?: string;
    selectedCollection?: ICollectionItem;
    onSelectionChanged?: (collectionItem: ICollectionItem) => void;
    onSearch?: (searchText: string, items: ICollectionItem[]) => ICollectionItem[] | Promise<ICollectionItem[]>;
    width?: number;
    preventDismissOnScroll?: boolean;
}

export interface IOrganizationInfoAndCollectionsPickerSectionProps {
    organizationInfoProps?: IOrganizationInfo;
    organizationCollectionsPickerProps?: IOrgCollectionsPickerProps;
}

export interface IReorderButtonProps {
    direction: Direction;
    handleReorderEvent(direction: Direction): void;
    className?: string;
    buttonId: string;
    ariaLabel: string;
}

export interface IHubButtonProps {
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    text: string;
}

export interface IHubFilterProps {
    watermark: string;
    onFocus?: () => any;
}

export interface IHubHeaderProps {
    title?: string;
    isOrganizationInfoAndCollectionPickerEnabled?: boolean;
    organizationInfoAndCollectionPickerProps?: IOrganizationInfoAndCollectionsPickerSectionProps;
    button?: IHubButtonProps;
    filter?: IHubFilterProps;
}

export interface HubData {
    groups: HubItemGroup<IHubItem>[];
    isLoading: boolean;
    header: IHubHeaderProps;
    alert?: JSX.Element;
    zeroData?: ZeroData.Props;
    allowGroupReordering: boolean;
    isFilterInUse: boolean;
}

export interface IHubStore {
    getData: () => HubData;
}

export interface ReorderActionPayload {
    direction: Direction;
    index: number;
    groups: HubItemGroup<IHubItem>[];
}

/* Button values for hub group, within toolbar component */
export enum Direction {
    Up,
    Down
}
