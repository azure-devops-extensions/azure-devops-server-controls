import * as React from "react";

import { ISplitterProps, Splitter } from "VSSUI/Splitter";
import { getDefaultWebContext } from "VSS/Context";
import { getService as getSettingsService, SettingsUserScope } from "VSS/Settings/Services";
import { TfsSettingsScopeNames } from "Presentation/Scripts/TFS/Generated/TFS.WebApi.Constants";

import "VSS/LoaderPlugins/Css!Agile/Scripts/Common/Components/SplitView/SplitView";

export interface ISplitViewProps extends ISplitterProps {
    registrySettingsPrefix: string;
    defaultSize?: number;
    onFixedSizeChanged?: (newSize: number) => void;
}

export interface ISplitViewState {
    size: number;
}

/**
 * Renders contents in left and right panel
 * Also serializes the visibility and size settings under given settings path
 */
export class SplitView extends React.Component<ISplitViewProps, ISplitViewState> {
    constructor(props: ISplitViewProps) {
        super(props);

        const settingsService = getSettingsService();
        const size = settingsService.getEntry<number>(this._getSizeKey(), SettingsUserScope.Me, TfsSettingsScopeNames.Project) || this.props.defaultSize || 500;

        this.state = {
            size: size
        };
    }

    public render() {
        const {
            size
        } = this.state;

        return (
            <Splitter
                // Default min/max widths can be overridden
                minFixedSize={250}
                maxFixedSize={1000}
                {...this.props}
                className="split-view"
                fixedSize={size}
                onFixedSizeChanged={this._onSplitterChanged}
            />
        );
    }

    private _getSizeKey() {
        return `${this.props.registrySettingsPrefix}.splitter.size`;
    }

    private _onSplitterChanged = (newSize: number) => {
        const {
            onFixedSizeChanged
        } = this.props;

        this._saveSplitterState(newSize);
        this.setState({ size: newSize });

        if (onFixedSizeChanged) {
            onFixedSizeChanged(newSize);
        }
    }

    protected _saveSplitterState = (size: number): void => {
        const settingsService = getSettingsService();
        const projectId = getDefaultWebContext().project.id;
        settingsService.setEntries({
            [this._getSizeKey()]: size,
        }, SettingsUserScope.Me, TfsSettingsScopeNames.Project, projectId);
    }
}