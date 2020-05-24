import * as React from "react";
import { css } from "OfficeFabric/Utilities";
import { Enhancement } from "VSS/Controls";
import * as VSSSplitter from "VSS/Controls/Splitter";
import {
    StatefulSplitterEnhancement,
    StatefulSplitterOptions,
    StatefulSplitterSetting,
} from "Presentation/Scripts/TFS/TFS.UI.Controls.Accessories";
import { getLocalService } from "VSS/Service";
import { LocalSettingsService } from "VSS/Settings";
import { Splitter, ISplitterProps } from "VSSPreview/Flux/Components/Splitter";

export interface StatefulSplitterProps extends ISplitterProps {
    /**
     * The path of local storage where current state will be persisted.
     */
    statefulSettingsPath?: string;

    /**
     * The selector of the element containing the HTML-embedded initial options.
     */
    optionsElementSelector?: string;

    /**
     * Fixed-pane visibility the first time (assuming there are no user preferences saved)
     */
    isFixedPaneVisibleByDefault?: boolean;

    /**
     * Fixed-pane size the first time (assuming there are no user preferences saved)
     */
    fixedPaneSizeByDefault?: number;
}

interface StorageOptions {
    statefulOptions: StatefulSplitterOptions;
    initialOptions: {
        initialSize: number;
        expandState?: string;
    };
}

/**
 * Render a splitter.
 */
export class StatefulSplitter extends React.Component<StatefulSplitterProps, {}> {
    private _containerElement: HTMLElement;
    private _statefulEnhancement: StatefulSplitterEnhancement;
    private _storageOptions: StorageOptions;

    static defaultProps = {
        isFixedPaneVisibleByDefault: true,
        fixedPaneSizeByDefault: 300,
    } as StatefulSplitterProps;

    constructor(props: StatefulSplitterProps) {
        super(props);

        this._storageOptions = this.getStorageOptions(props);
    }

    public render(): JSX.Element {
        const className = css(
            this.props.className,
            { "stateful": Boolean(this.props.statefulSettingsPath) });

        return (
            <Splitter
                {...this.props}
                {...this._storageOptions.initialOptions}
                className={className}
                containerRef={ref => this._containerElement = ref}
            />);
    }

    public componentDidMount(): void {
        this._enhanceSplitter();
    }

    public componentWillUnmount(): void {
        if (this._statefulEnhancement) {
            this._statefulEnhancement.dispose();
        }
    }

    public componentWillUpdate(nextProps: StatefulSplitterProps) {
        if (nextProps.statefulSettingsPath
            && (nextProps.statefulSettingsPath !== this.props.statefulSettingsPath)) {
            this._storageOptions = this.getStorageOptions(nextProps);
            this._enhanceSplitter();
            this._statefulEnhancement.setSettingPath(nextProps.statefulSettingsPath);
        }
    }

    /**
     * Create the splitter enhancement.
     */
    private _enhanceSplitter() {
        if (this._storageOptions.statefulOptions) {
            this._statefulEnhancement = Enhancement.enhance(
                StatefulSplitterEnhancement,
                this._containerElement,
                this._storageOptions.statefulOptions,
            ) as StatefulSplitterEnhancement;
        }
    }

    private getStorageOptions(props: StatefulSplitterProps): StorageOptions {
        return this.getSplitterOptionsFromEmbeddedHtml(props) ||
            this.getSplitterOptionsFromLocalStorage(props) ||
            {} as StorageOptions;
    }

    private getSplitterOptionsFromEmbeddedHtml({ optionsElementSelector }: StatefulSplitterProps): StorageOptions {
        if (optionsElementSelector) {
            const $container = $(optionsElementSelector);
            const tmpOptions = Enhancement.getEnhancementOptions(StatefulSplitterEnhancement, $container);

            if (tmpOptions) {
                return {
                    initialOptions: {
                        initialSize: tmpOptions.initialSize,
                    },
                    statefulOptions: {
                        settingPath: tmpOptions.settingPath,
                        useLocalStorage: tmpOptions.useLocalStorage,
                    },
                };
            }
        }
    }

    private getSplitterOptionsFromLocalStorage(props: StatefulSplitterProps): StorageOptions {
        if (props.statefulSettingsPath) {
            const localSettings = getLocalService(LocalSettingsService).read(
                props.statefulSettingsPath,
                {
                    size: props.fixedPaneSizeByDefault,
                    expanded: props.isFixedPaneVisibleByDefault,
                } as StatefulSplitterSetting);

            return {
                initialOptions: {
                    initialSize: localSettings.size,
                    expandState: localSettings.expanded ? null : "right",
                },
                statefulOptions: {
                    settingPath: props.statefulSettingsPath,
                    useLocalStorage: true,
                },
            };
        }
    }
}
