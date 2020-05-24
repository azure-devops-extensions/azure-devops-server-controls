import React = require("react");

import { CommandButton, IButtonProps } from "OfficeFabric/Button";
import { Callout } from 'OfficeFabric/Callout';
import { Dropdown, IDropdownOption } from "OfficeFabric/Dropdown";
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { Icon } from 'OfficeFabric/Icon';
import { autobind, BaseComponent, css, focusFirstChild, IBaseProps, KeyCodes } from "OfficeFabric/Utilities";

import * as stylesImport from 'OfficeFabric/components/Dropdown/Dropdown.scss';

import Culture = require("VSS/Utils/Culture");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");

import { DateTimeRangePicker } from "VSSUI/Components/DateTimeRangePicker/DateTimeRangePicker";

import Resources = require("Utilization/Scripts/Resources/TFS.Resources.Utilization");
import { getStartAndEndTimesInClientTimeZone, QueryDateKeys, QueryDateNames, TimeBinKeys, TimeBinNames } from "Utilization/Scripts/UrlStateHelper";
import { PickListDropdown, IPickListItem, IPickListSelection } from "VSSUI/PickList";
import { SelectionMode } from "OfficeFabric/Selection";

const styles: any = stylesImport;

export interface TimeRangePickerProps extends IBaseProps {
    initialValue?: string;
    initialTimeBin?: string;
    onAccept?: (value: string, timeBin: string) => void;
}

export interface TimeRangePickerState {
    isCalloutVisible?: boolean;
    selectedKey?: string;
    selectedTimeBin?: string;
}

export class TimeRangePicker extends BaseComponent<TimeRangePickerProps, TimeRangePickerState> {

    private _menuButtonElement: HTMLElement;
    private _customDateTimeRangePickerElement: HTMLDivElement;

    private _customStartTimeInUserTimeZone: Date;
    private _customEndTimeInUserTimeZone: Date;


    constructor(props: TimeRangePickerProps) {
        super(props);

        let selectedKey: string = this._parseInitialValue(this.props.initialValue);
        let selectedTimeBin: string = this.props.initialTimeBin ? this.props.initialTimeBin : TimeBinKeys[0];

        this.state = {
            isCalloutVisible: false,
            selectedKey: selectedKey,
            selectedTimeBin: selectedTimeBin,
        };
    }

    public render(): JSX.Element {

        let entries = [];
        for (let i = 0; i < QueryDateKeys.length; i++) {
            let key: string = QueryDateKeys[i];
            let isSelected: boolean = this.state.selectedKey === key;
            entries.push(<CommandButton
                key={key}
                id={key}
                className={css(
                    'ms-Dropdown-item', styles.item, {
                        ['is-selected ' + styles.itemIsSelected]: isSelected,
                    }
                )}
                tabIndex={-1}
                aria-selected={isSelected}
                text={QueryDateNames[key]}
                role='option'
                onClick={() => {
                    if (key !== this.state.selectedKey) {
                        this.setState({
                            selectedKey: key
                        });
                        if (key === "custom") {
                            focusFirstChild(this._customDateTimeRangePickerElement);
                        }
                        else {
                            this._acceptSelection(key, this.state.selectedTimeBin);
                            this.setState({
                                isCalloutVisible: !this.state.isCalloutVisible,
                            });
                        }
                    }
                }}
            />);
        }

        let mainButtonText: string;
        if (this.state.selectedKey === "custom") {
            let dateTimeFormat: Culture.IDateTimeFormatSettings = Culture.getDateTimeFormat();
            mainButtonText = Utils_Date.format(this._customStartTimeInUserTimeZone, dateTimeFormat.ShortDatePattern) + " " + Utils_Date.format(this._customStartTimeInUserTimeZone, dateTimeFormat.ShortTimePattern) + " - " +
                             Utils_Date.format(this._customEndTimeInUserTimeZone, dateTimeFormat.ShortDatePattern) + " " + Utils_Date.format(this._customEndTimeInUserTimeZone, dateTimeFormat.ShortTimePattern);
        }
        else {
            mainButtonText = QueryDateNames[this.state.selectedKey];
        }

        return <div className="timerangepicker-filter">
            <div ref={(menuButton) => this._menuButtonElement = menuButton}>
                <CommandButton
                    className="timerangepicker-main-button"
                    onRenderMenuIcon={(p: IButtonProps) => {
                        return <Icon iconName={'ChevronDown'} />; // this seems to be a more reliable way to get the right-aligned chevron down. The other way would be to use iconProps and then use absolute positioning.
                    }}
                    onClick={this._onDismiss}
                    text={mainButtonText}
                    aria-expanded = {this.state.isCalloutVisible}
                    ariaLabel = {`${Resources.FilterContainer_TimeRange}: ${mainButtonText}`}
                />
            </div>
            {this.state.isCalloutVisible ? (
                <Callout className="timerangepicker-callout"
                    gapSpace={0}
                    isBeakVisible={false}
                    target={this._menuButtonElement}
                    onDismiss={this._onFocusLost}>

                    <div onKeyDown={this._onKeyDown} >
                        <FocusZone
                            direction={FocusZoneDirection.vertical}
                            defaultActiveElement={'#' + this.state.selectedKey}
                            role='listbox'>
                            {entries}
                        </FocusZone>
                    </div>

                    <div className="custom-timerange-container"
                        ref={(x) => this._customDateTimeRangePickerElement = x} // we need this to be populated even when it's not visible.
                        style={this.state.selectedKey !== "custom" ? {
                            visibility: "hidden",
                            maxHeight: '0px',
                            overflow: 'hidden'
                        } : (null)}> {/* // this controls whether the custom date time range picker is visible. */}
                        <DateTimeRangePicker
                            defaultStartTime={this._customStartTimeInUserTimeZone}
                            defaultEndTime={this._customEndTimeInUserTimeZone}
                            onValueChanged={(newStartTime: Date, newEndTime: Date) => {
                                this._customStartTimeInUserTimeZone = newStartTime;
                                this._customEndTimeInUserTimeZone = newEndTime;
                            }}
                            formatDate={(date) => { return Utils_Date.format(date, Culture.getDateTimeFormat().ShortDatePattern); }}
                            formatTime={(date) => { return Utils_Date.format(date, Culture.getDateTimeFormat().ShortTimePattern); }}
                            parseTimeFromString={(timeStr: string): Date => {
                                let parsedTime = Utils_Date.parseDateString(timeStr, Culture.getDateTimeFormat().ShortTimePattern, true);
                                if (!parsedTime) {
                                    parsedTime = Utils_Date.parseDateString(timeStr, "H:mm", true);
                                }
                                return parsedTime;
                            }}
                        />
                    </div>

                    <div role='separator' className={css('ms-Dropdown-divider', styles.divider)} key={"sep"} />

                    <div className="timebin-container" onKeyDown={this._onKeyDownTimeBin}>
                        <span className="title">{Resources.TimeRangePicker_BinInterval}</span>
                        <PickListDropdown
                            className="timebin"
                            selectionMode={SelectionMode.single}
                            selectedItems={[this.state.selectedTimeBin]}
                            getListItem={this._getTimeBinListItem}
                            getPickListItems={() => {
                                return TimeBinKeys;
                            }}
                            ariaLabelFormat={Resources.TimeRangePicker_BinInterval + " : " + TimeBinNames[this.state.selectedTimeBin]}

                            onSelectionChanged={(selection: IPickListSelection) => {
                                if (selection.selectedItems.length > 0 && this.state.selectedTimeBin !== selection.selectedItems[0]) {
                                    this.setState({
                                        selectedTimeBin: selection.selectedItems[0]
                                    });
                                }
                            }}
                            onFocusLost={this._onFocusLost}
                        />
                    </div>

                </Callout>
            ) : (null)}
        </div>;

    }

    private _getTimeBinListItem(item): IPickListItem {
        return {
            key: item,
            name: TimeBinNames[item]
        };
    }

    private _onKeyDown = (ev: React.KeyboardEvent<HTMLElement>) => {
        // When a user shift+tab out of the drop down, close the callout to avoid focus going to the wrong area
        if ((ev.shiftKey && ev.which === KeyCodes.tab) || ev.which === KeyCodes.escape) {
            this.setState({
                isCalloutVisible: !this.state.isCalloutVisible,
            });
        }
    }

    private _onFocusLost = () => {
        if (this.state.isCalloutVisible) {
            this._acceptSelection(this.state.selectedKey, this.state.selectedTimeBin);
        }

        this.setState({
            isCalloutVisible: !this.state.isCalloutVisible,
        });
    }

    private _onKeyDownTimeBin = (ev: React.KeyboardEvent<HTMLElement>) => {
        // When a user tabs from time bin, close it so it focuses on the next element
        if ((!ev.shiftKey && ev.which === KeyCodes.tab) || ev.which === KeyCodes.escape) {
            this.setState({
                isCalloutVisible: !this.state.isCalloutVisible,
            });
        }
    }

    public componentWillReceiveProps(nextProps: TimeRangePickerProps) {
        let selectedKey = this._parseInitialValue(nextProps.initialValue);
        let selectedTimeBin: string = nextProps.initialTimeBin ? nextProps.initialTimeBin : TimeBinKeys[0];
        this.setState({
            selectedKey: selectedKey,
            selectedTimeBin: selectedTimeBin
        });
    }

    @autobind
    private _onDismiss(ev: any) {
        if (this.state.isCalloutVisible) {
            this._acceptSelection(this.state.selectedKey, this.state.selectedTimeBin);
        }

        this.setState({
            isCalloutVisible: !this.state.isCalloutVisible,
        });
    }

    private _acceptSelection(selectedKey: string, selectedTimeBin: string) {
        if (this.props.onAccept) {
            let queryDate = selectedKey;
            if (queryDate === "custom") {
                queryDate = Utils_String.dateToString(Utils_Date.shiftToUTC(Utils_Date.convertUserTimeToClientTimeZone(this._customStartTimeInUserTimeZone)), false, "yyyy-MM-ddTHH:mm:ss") + "," + Utils_String.dateToString(Utils_Date.shiftToUTC(Utils_Date.convertUserTimeToClientTimeZone(this._customEndTimeInUserTimeZone)), false, "yyyy-MM-ddTHH:mm:ss");
            }
            this.props.onAccept(queryDate, selectedTimeBin);
        }
    }

    private _parseInitialValue(initialValue: string): string {
        let selectedKey: string;
        let startAndEndTimes: { startTime: Date, endTime: Date };
        if (initialValue)
        {
            selectedKey = QueryDateKeys.indexOf(initialValue) > -1 ? initialValue : "custom";
            startAndEndTimes = getStartAndEndTimesInClientTimeZone(initialValue);
        }
        else
        {
            selectedKey = QueryDateKeys[0];
            startAndEndTimes = getStartAndEndTimesInClientTimeZone(QueryDateKeys[0]);
        }

        this._customStartTimeInUserTimeZone = Utils_Date.convertClientTimeToUserTimeZone(startAndEndTimes.startTime);
        this._customEndTimeInUserTimeZone = Utils_Date.convertClientTimeToUserTimeZone(startAndEndTimes.endTime);
        return selectedKey;
    }


}