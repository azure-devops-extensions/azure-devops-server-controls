export interface PivotTab {
    tabKey: string;

    title: string;

    ariaLabel: string;

    count?: number;

    countFormat?: CountFormat;
}

export enum CountFormat {
    /**
    * Rendered format is 1M, 2K, 1.6M etc.
    */
    ToNearest = 1,

    /**
    * Rendered format is 50+, 40+ etc.
    */
    LessThanEqualTo = 2,

    /**
    * Corresponding string representation of count rendered.
    */
    None = 3
}

export interface PivotContainerProps {
    /**
    * Pivot items to show in the container.
    */
    pivotTabs: PivotTab[];

    /**
    * Action invoked on tab click.
    */
    onTabClick: (tabId: string) => void;

    /**
    * tab key of the selected tab.
    */
    selectedTabId: string;

    /**
    * Optional class name added to the root element.
    */
    className?: string;
}