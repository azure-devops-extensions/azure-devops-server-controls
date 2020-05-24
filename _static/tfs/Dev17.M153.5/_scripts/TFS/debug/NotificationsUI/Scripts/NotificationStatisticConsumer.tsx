/*
    * NotificationstatisticConsumer.tsx
    * This file is responsible for the following features:
    * (1) Consuming statistic data and to create tiles.
    *   (a) Defining interfaces for React components that will draw Tiles to the screen.
    *   (b) Defining the React components that will draw Tiles to the screen.
    *   (c) Parsing the data needed for Tiles that will be drawn to the screen.
            * Note: this file is not responsible for creating the data that gets parsed.
    * (2) Using the same statistic data from (1), collected over a larger period of time, to create graphs showing the change over time.
    *    (a) Use the Chart component from the Compass team.
    *    (b) Give the data 
 */

// react
import React = require("react");
import ReactDOM = require("react-dom");

// getting and managing data
import { Props } from "VSS/Flux/Component";
import * as Store from "NotificationsUI/Scripts/Stores/SubscriptionStore";
import { NotificationStatistic, NotificationStatisticType } from "Notifications/Contracts";

import * as Charts from "WidgetComponents/ChartComponent";
import { DataSeries } from "Charts/Contracts";

// office fabric
import "VSS/LoaderPlugins/Css!fabric";
import { Toggle } from "OfficeFabric/Toggle";
import { TooltipHost } from "OfficeFabric/components/Tooltip/TooltipHost";

import * as NotificationStatisticAction from "NotificationsUI/Scripts/Actions/NotificationStatisticAction";
import { NotificationStatisticStore } from "./Stores/NotificationStatisticStore";

import { autobind } from "OfficeFabric/Utilities";
import { DefaultButton } from "OfficeFabric/Button";

/**
 * The maximum number that can be displayed in a statistic tile.
 * This is set to 9999 based on the height/width of the tile supporting roughly 4 characters.
 * @const
 * @type {number}
 */
const MAXDISPLAYNUMBER: number = 9999;

/**
 * The message to display on a statistic tile that has more than MAXDISPLAYNUMBER
 * Since the tiles currently support up to 4 numbers, "10K+" is used to represent "10,000 or more"
 * @const
 * @type {string}
 */
const MAXDISPLAYMESSAGE: string = "10K+";

/**
 * The number of milliseconds in an hour. This is used to compare times and determine which events have come in within the past hour.
 * @const
 * @type {number}
 */
const MSPERHOUR: number = 3.6e6;

/**
 * The number of milliseconds in 10 minutes. This is used to get our most recent UnprocessedEvent queue sizes.
 */
const MSPERTENMINUTES: number = 6e5;

/**
 * The number of milliseconds in one minute. This is used to express our delays in a more reasonable form
 */
const MSPERMINUTE: number = 6e4;

/**
 * The highest (most frequent) granularity of the statistic data, in minutes. 
 */
const GRANULARITY: number = 5;

/**
 * The furthest back we will poll data.
 */
const ONEWEEKAGO: Date = new Date();
ONEWEEKAGO.setDate(new Date().getDate() - 7);

/**
 * Number of milliseconds in a day, used to calculate day differences in data.
 */
const MSPERDAY: number = (24 * 1000 * 3600);

// the numbers at which tiles will change colour based on delay level
const LOWDELAY = 1;
const HIGHDELAY = 30;

/**
 * Interface for drawing a tile.
 * @interface
 * @member {string} head - The title text for the tile
 * @member {number} data - The statistic data
 * @member {string} foot - The bottom text for the tile
 * @member {string} hover - The hover text for the tile (provides additional detail on the statistic). Null if no additional data available
 * @member {boolean} shortView - Determines if a tile displays 'short' (1 hour, 24 hours) or 'long'-term data (24 hours, 7 days). Null if statistic does not have multiple forms.
 */
export interface ITileProps {
    head: string;
    foot: string;
    data: string;
    hover: string;
    shortView: boolean;
    condition?: TileConditions;
}

/**
 * Interface for defining the props of the NotificationStatisticTiles class, whose State is used for all of the various Tile objects.
 * @interface
 * @member {SubscriptionStore} subscriptionStore - Contains various statistic data and information needed to organise it.
 */ 
export interface IStatisticTilesProperties extends Props {
    subscriptionStore: Store.SubscriptionStore;
}

/**
 * Interface for representing the sate of notification statistic tiles.
 * @interface
 * @member {ITileProps} events - Tile statistic for the number of events processed in a specific time frame.
 * @member {ITileProps} delay - Tile statistic for the delay in delivering notifications.
 * @member {ITileProps} notifications - Tile statistic for the number of notifications delivered in a specific time frame.
 */
export interface ITileStates {
    processedEventTile: ITileProps;
    processedNotificationTile: ITileProps;
}

/**
 * Interface for defining the props used when rendering notification statistic related graphs.
 * @interface
 * @member {string} xTitle - Label for the x-axis
 * @member {string} yTitle - Label for the y-axis
 * @member {string[]} labelValues - What values appear on the x-axis (e.g. time of day)
 * @member {DataSeries[]} data - The pairs of (x,y) values used to construct the graph
 * @member {boolean} shortView - A value representing whether a one-hour or one-day view of the graph is currently being displayed.
 */
export interface IGraphProps {
    xTitle: string;
    yTitle: string;
    labelValues: string[];
    chartType: string;
    data: DataSeries[];
    shortView: boolean;
}

/**
 * Interface for containing the various Graphs that need to be rendered.
 * @member {IGraphProps} eventProcessedGraph - Graph that shows the number of events processed over time.
 * @member {IGraphProps} notificationProcessedGraph - Graph that sohws the number of notifications processed over time.
 * @member {IGraphProps} eventQueueGraph - Graph that shows the size of the event queue over time.
 * @member {IGraphProps} notifQueueGraph - Graph that shows the size of the notification queue over time.
 */
export interface IGraphStates {
    eventProcessedGraph: IGraphProps;
    notificationProcessedGraph: IGraphProps;
    eventQueueGraph: IGraphProps;
    notifQueueGraph: IGraphProps;
    notificationPipelineGraph: IGraphProps;
    totalPipelineGraph: IGraphProps;
    eventPipelineGraph: IGraphProps;
}

export enum TileConditions {
    Low = 1,
    Normal = 2,
    Critical = 3
}

interface AgeTracker {
    age: number;
    source: string;
}

// variables initialized on page load
// tiles
const dailyData: ITileProps[] = [];
const hourlyData: ITileProps[] = [];

// graphs
const eventsProcessedData: { [key: number]: IGraphProps } = {};
const notifProcessedData: { [key: number]: IGraphProps } = {};
const eventQueueData: { [key: number]: IGraphProps } = {};
const notifQueueData: { [key: number]: IGraphProps } = {};
const notifPipelineData: { [key: number]: IGraphProps } = {};
const totalPipelineData: { [key: number]: IGraphProps } = {};
const eventPipelineData: { [key: number]: IGraphProps } = {};

// data breakdowns
const dailyEventDataByPublisherByHour: { [key: string]: { [key: string]: number } } = {};
const dailyNotificationDataBySubscriptionByHour: { [key: string]: { [key: string]: number } } = {};
const hourlyEventQueueSizeByPublisherByGranularity: { [key: string]: { [key: string]: number } } = {};
const dailyEventQueueSizeByPublisherByHour: { [key: string]: { [key: string]: number } } = {};
const hourlyNotifQueueSizeByPublisherByGranularity: { [key: string]: { [key: string]: number } } = {};
const dailyNotifQueueSizeByChannelAndPublisherByHour: { [key: string]: { [key: string]: number } } = {};
const eventPublisherWithHighestDelay: AgeTracker = { age: -1, source: "{Publisher}" };
const notifChannelPublisherWithHighestDelay: AgeTracker = { age: -1, source: "{Publisher}" };

// time
const currentTime = new Date();
const currentHour = currentTime.getHours();
const currentSegment = currentTime.getMinutes() / GRANULARITY;

// default tiles that get reassigned after obtaining the correct data.
let notificationQueueSize: ITileProps = { head: null, foot: null, data: null, hover: null, shortView: null };
let oldestNotificationTile: ITileProps = { head: "Oldest Queued Notification", foot: "Publisher", data: "--", hover: null, shortView: null };
let eventQueueSize: ITileProps = { head: null, foot: null, data: null, hover: null, shortView: null };
let oldestEventTile: ITileProps = { head: "Oldest Queued Event (M)", foot: "Publisher", data: "--", hover: null, shortView: null };
let totalPipelineTimeTile: ITileProps = { head: null, foot: null, data: null, hover: null, shortView: null };
let notifPipelineTimeTile: ITileProps = { head: null, foot: null, data: null, hover: null, shortView: null };
let eventPipelineTimeTile: ITileProps = { head: null, foot: null, data: null, hover: null, shortView: null };


function makeChannelAndPublisherNamesFriendly(name: string) {
    const edit1 = name.replace("User", "Email");
    const edit2 = edit1.replace("EmailHtml", "Email");
    const removeWorkHeader = edit2.replace("ms.vss-work.", "");
    const removeCodeHeader = removeWorkHeader.replace("ms.vss-code.", "");
    const removeBuildHeader = removeCodeHeader.replace("ms.vss-build.", "");
    return removeBuildHeader.replace("ServiceHooks", "Service Hooks");
}

/**
 * @function updateSegmentedGraph
 * @param graph
 * @param key1
 * @param key2
 * @param hitCount
 */
function updateSegmentedGraph(graph: { [key: string]: { [key: string]: number } }, key1: string, key2: string, hitCount: number) {
    graph[key1] = graph[key1] || {};
    graph[key1][key2] = (graph[key1][key2] || 0) + hitCount;
}

/**
 * @function combineObjectKeyAndData
 * @param data - An object containing data broken down by source.
 * Takes the object and turns it into a single line-formatted string.
 */
function combineObjectKeyAndData(data: { [key: string]: number }): string {
    const words: string[] = [];

    for (const key of Object.keys(data)) {
        words.push(key + ": " + data[key]);
    }

    return words.join("\n");
}

/**
 * @function updateFromPollTime
 * @param statDate - The date of the current stat
 * @param poll - Our most recent event logged
 * @param sink - Stores data relating to most recent event
 * @param count
 * @param path
 * @param breakdown
 * @param pipeline
 * Updates data based on whether or not it is the most recent source of data.
 */
function updateFromPollTime(statDate: number, poll: Date, sink: AgeTracker, count: number, path: string, breakdown: IDictionaryStringTo<number>, pipeline?: boolean) {
    breakdown[path] = (statDate >= poll.getTime()) ? (pipeline ? Math.ceil(count/MSPERMINUTE) : count) : breakdown[path];
    if (statDate > poll.getTime()) {
        // update AgeTracker
        sink.source = path;
        sink.age = count;

        // update Breakdown object
        // if we simply do breakdown = {} here, we lose the reference since we create a new object
        // this means breakdown[path] becomes undefined for the original object
        // so, instead, we simply empty the object
        Object.keys(breakdown).forEach(function (key) { delete breakdown[key]; });
        breakdown[path] = pipeline ? Math.ceil(count / MSPERMINUTE) : count;
        return true;
    } else if (statDate === poll.getTime()) {
        if (sink.age < count) {
            sink.age = count;
            sink.source = path;
        }
        breakdown[path] = Math.max(breakdown[path] || 0, pipeline ? Math.ceil(count / MSPERMINUTE) : count);
    }
    return false;
}

/**
 * @function updateDailyAndWeeklyViews
 * @param daysOld
 * @param hoursOld
 * @param count
 * @param path
 * @param dailyView
 * @param weeklyView
 */
function updateDailyAndWeeklyViews(daysOld: number, hoursOld: number, count: number, path: string, dailyView: { [key: string]: { [key: string]: number } }, weeklyView: { [key: string]: { [key: string]: number } }) {
    if (daysOld === 0) {
        dailyView[path] = dailyView[path] || {};
        dailyView[path][hoursOld] = Math.max(dailyView[path][hoursOld] || 0, +(count / MSPERMINUTE).toFixed(2));
    }
    if (daysOld < 7) {
        weeklyView[path] = weeklyView[path] || {};
        weeklyView[path][daysOld] = Math.max(weeklyView[path][daysOld] || 0, +(count / MSPERMINUTE).toFixed(2));
    }
}

/**
 * This function runs once and takes all of the most recent statistic data 
 * we have up until that point. It categorises the data into daily and hourly
 * counts of both event and notification data. It also creates a breakdown
 * of the type/source of the events and notifications, accessible by hovering over tiles.
 */
function initializeNotificationStatisticData(subscriptionStore: Store.SubscriptionStore, statisticStore: NotificationStatisticStore): void {
    let eventSum = 0;
    let hourlyEventSum = 0;
    let notifSum = 0;
    let hourlyNotifSum = 0;
    let eventQueueSum = 0;
    let notifQueueSum = 0;

    const highestTotalPipelineDelayTime: AgeTracker = { age: -1, source: "{Publisher}" };
    const highestNotifPipelineDelayTime: AgeTracker = { age: -1, source: "{Channel/Publisher}" };
    const highestEventPipelineDelayTime: AgeTracker = { age: -1, source: "{Publisher}" };

    // look back no further than one week for queue or processing results
    // only display the most recently inserted queue size updates 
    let mostRecentEventQueuePoll = ONEWEEKAGO;
    let mostRecentEventDelayPoll = ONEWEEKAGO;
    let mostRecentNotificationQueuePoll = ONEWEEKAGO;
    let mostRecentNotificationDelayPoll = ONEWEEKAGO;
    let mostRecentTotalPipelinePoll = ONEWEEKAGO;
    let mostRecentNotificationPipelinePoll = ONEWEEKAGO;
    let mostRecentEventPipelinePoll = ONEWEEKAGO;

    // maps event publishers and notification channels to the Number of events/notifications caused by them
    // e.g. eventInitiators[p] = x means publisher p has published x events
    const eventInitiators: IDictionaryStringTo<number> = {};
    const notifChannels: IDictionaryStringTo<number> = {};
    const hourlyEventInitiators: IDictionaryStringTo<number> = {};
    const hourlyNotifChannels: IDictionaryStringTo<number> = {};

    const weeklyNotificationChannelsByDay: { [key: string]: { [key: string]: number } } = {};
    const dailyNotificationPipelineTimeByHour: { [key: string]: { [key: string]: number } } = {};
    const weeklyNotificationPipelineTimeByDay: { [key: string]: { [key: string]: number } } = {};
    const dailyTotalPipelineTimeByPublisherByHour: { [key: string]: { [key: string]: number } } = {};
    const weeklyTotalPipelineTimeByPublisherByDay: { [key: string]: { [key: string]: number } } = {};
    const dailyEventPipelineTimeByPublisherByHour: { [key: string]: { [key: string]: number } } = {};
    const weeklyEventPipelineTimeByPublisherByDay: { [key: string]: { [key: string]: number } } = {};

    let eventQueueByPublisher: IDictionaryStringTo<number> = {};
    let notifQueueByChannelByPublisher: IDictionaryStringTo<number> = {};

    const oldestEventsByPublisher: IDictionaryStringTo<number> = {};
    const oldestNotificationByChannelByPublisher: IDictionaryStringTo<number> = {};
    const totalPipelineDelayTimeByChannelAndPublisher: IDictionaryStringTo<number> = {};
    const notifPipelineDelayTimeByChannelAndPublisher: IDictionaryStringTo<number> = {};
    const eventPipelineDelayTimeByPublisher: IDictionaryStringTo<number> = {};

    // contains raw data
    const viewData = subscriptionStore.getData(); 
    // contains mapping data
    const serviceData = subscriptionStore.getServiceData();
    // contains eventbyeventtype, notificationbysubscription, and daily rollup data
    const tfsDataProviderStats = viewData.statistics;
    // contains unprocessed and pipeline related data 
    const granularStats = statisticStore.getQueryResults(); 
    const map = serviceData.mapEventTypeToPublisherId;

    // current time, defined outside of loop to prevent events being dropped into different hours if the page starts loading at XX:59:YY and finishes at ZZ:00
    const currentTime = Date.now();
    for (const statArray of granularStats) {
        for (const stat of statArray) {
            const type = stat.type;
            const path = stat.path && makeChannelAndPublisherNamesFriendly(stat.path);
            const count = stat.hitCount;
            const statHours = stat.date.getHours();
            const date = stat.date;
            const statDate = stat.date.getTime();
            const hoursOld = Math.floor((currentTime - statDate) / MSPERHOUR);
            const daysOld = Math.floor((currentTime - statDate) / MSPERDAY);
            const service = subscriptionStore.getDefaultServiceInstanceType();
            const segmentation = 1000 * 60 * GRANULARITY; // number of minutes to round to

            if (type === NotificationStatisticType.HourlyEvents) {
                if (daysOld === 0) {
                    eventSum += count;
                }
                if (hoursOld === 0) {
                    hourlyEventSum += count;
                }
            }
            else if (type === NotificationStatisticType.HourlyNotifications) {
                if (daysOld === 0) {
                    notifSum += count;
                }
                if (hoursOld === 0) {
                    hourlyNotifSum += count;
                }
            }
            else if (type === NotificationStatisticType.HourlyEventsByEventTypePerUser) {
                // drop the data into the correct bucket
                // if the date is the current hour, perform a bit of extra work for the tile display
                if (hoursOld === 0) {
                    hourlyEventInitiators[path] = (hourlyEventInitiators[path] || 0) + count;
                }
                updateSegmentedGraph(dailyEventDataByPublisherByHour, path, "" + hoursOld, count);
            }
            else if (type === NotificationStatisticType.HourlyNotificationBySubscription) {
                if (hoursOld === 0) {
                    hourlyNotifChannels[path] = (hourlyNotifChannels[path] || 0) + count;
                }
                updateSegmentedGraph(dailyNotificationDataBySubscriptionByHour, path, "" + hoursOld, count);
                updateSegmentedGraph(weeklyNotificationChannelsByDay, path, "" + daysOld, count);
            }
            else if (type === NotificationStatisticType.UnprocessedEventsByPublisher) {
                const publisher = path;
                const hoursOld = Math.floor((currentTime - statDate) / MSPERHOUR);
                // we can use this to build a "queue size over time"
                // if this is from our most recent set, add it to our charting tile
                // Then, if it belongs to the last hour, we need to add it to that chart data.
                // Then, if it belongs to the last day, we need to add it to that chart data.
                if (statDate > mostRecentEventQueuePoll.getTime()) {
                    // when we get newer data, we want to reassign to a blank slate.
                    // if a publisher has no recent data, it means there is no backlog
                    // and we do not want to show old data
                    eventQueueSum = count;
                    eventQueueByPublisher = {};
                    eventQueueByPublisher[publisher] = count;
                    mostRecentEventQueuePoll = date;
                }
                else if (statDate === mostRecentEventQueuePoll.getTime()) {
                    eventQueueSum += count;
                    eventQueueByPublisher[publisher] = (eventQueueByPublisher[publisher] || 0) + count;
                }
                if (hoursOld === 0) {
                    const minutesOld = Math.floor((currentTime - statDate) / MSPERMINUTE);
                    const segment = minutesOld / GRANULARITY;
                    updateSegmentedGraph(hourlyEventQueueSizeByPublisherByGranularity, publisher, "" + segment, count);
                }
            }
            else if (type === NotificationStatisticType.UnprocessedEventDelayByPublisher) {
                // only deals with the most recent ones
                const segmentedDate = new Date(Math.floor(statDate / segmentation) * segmentation);
                const segmentTime = segmentedDate.getTime();
                const result = updateFromPollTime(segmentTime, mostRecentEventDelayPoll, eventPublisherWithHighestDelay, count, path, oldestEventsByPublisher);
                // set the poll time to the most recent granularity
                if (result) {
                    mostRecentEventDelayPoll = segmentedDate;
                }
            }
            else if (type === NotificationStatisticType.UnprocessedNotificationsByChannelByPublisher) {
                const channelAndPublisher = path;
                // we can use this to show queue size over time
                if (statDate > mostRecentNotificationQueuePoll.getTime()) {
                    notifQueueSum = count;
                    notifQueueByChannelByPublisher = {};
                    notifQueueByChannelByPublisher[channelAndPublisher] = count;
                    mostRecentNotificationQueuePoll = date;
                } else if (statDate === mostRecentNotificationQueuePoll.getTime()) {
                    notifQueueSum += count;
                    notifQueueByChannelByPublisher[channelAndPublisher] = (notifQueueByChannelByPublisher[channelAndPublisher] || 0) + count;
                }
                if (hoursOld === 0) {
                    const minutesOld = Math.floor((currentTime - statDate) / MSPERMINUTE);
                    const segment = minutesOld / GRANULARITY;
                    updateSegmentedGraph(hourlyNotifQueueSizeByPublisherByGranularity, channelAndPublisher, "" + segment, count);
                }
            }
            else if (type === NotificationStatisticType.UnprocessedNotificationDelayByChannelByPublisher) {
                const segmentedDate = new Date(Math.floor(statDate / segmentation) * segmentation);
                const segmentTime = segmentedDate.getTime();
                const result = updateFromPollTime(segmentTime, mostRecentNotificationDelayPoll, notifChannelPublisherWithHighestDelay, count, path, oldestNotificationByChannelByPublisher);
                if (result) {
                    mostRecentNotificationDelayPoll = segmentedDate;
                }
            } else if (type === NotificationStatisticType.TotalPipelineTime) {
                const segmentedDate = new Date(Math.floor(statDate / segmentation) * segmentation);
                const segmentTime = segmentedDate.getTime();
                const result = updateFromPollTime(segmentTime, mostRecentTotalPipelinePoll, highestTotalPipelineDelayTime, count, path, totalPipelineDelayTimeByChannelAndPublisher, true);
                if (result) {
                    mostRecentTotalPipelinePoll = segmentedDate;
                }
            } else if (type === NotificationStatisticType.NotificationPipelineTime) {
                const segmentedDate = new Date(Math.floor(statDate / segmentation) * segmentation);
                const segmentTime = segmentedDate.getTime();
                const result = updateFromPollTime(segmentTime, mostRecentNotificationPipelinePoll, highestNotifPipelineDelayTime, count, path, notifPipelineDelayTimeByChannelAndPublisher, true);
                if (result) {
                    mostRecentNotificationPipelinePoll = segmentedDate;
                }
            } else if (type === NotificationStatisticType.EventPipelineTime) {
                const segmentedDate = new Date(Math.floor(statDate / segmentation) * segmentation);
                const segmentTime = segmentedDate.getTime();
                const result = updateFromPollTime(segmentTime, mostRecentEventPipelinePoll, highestEventPipelineDelayTime, count, path, eventPipelineDelayTimeByPublisher, true);
                if (result) {
                    mostRecentEventPipelinePoll = segmentedDate;
                }
            } else if (type === NotificationStatisticType.HourlyUnprocessedEventsByPublisher) {
                if (daysOld === 0) {
                    // if multiple segments belong to the same hour, e.g. a query at 8:05 and 8:45, we want to take only the worst-case scenario we experienced
                    // use short-circuiting to avoid errors on this check
                    if (dailyEventQueueSizeByPublisherByHour[path] && dailyEventQueueSizeByPublisherByHour[path][hoursOld]) {
                        // data already exists. only override if this is a "worse" segment
                        if (dailyEventQueueSizeByPublisherByHour[path][hoursOld] < count) {
                            updateSegmentedGraph(dailyEventQueueSizeByPublisherByHour, path, "" + hoursOld, count);
                        }
                    } else {
                        // data did not exist, so we need to create some
                        updateSegmentedGraph(dailyEventQueueSizeByPublisherByHour, path, "" + hoursOld, count);
                    }
                }
            } else if (type === NotificationStatisticType.HourlyUnprocessedNotificationsByChannelByPublisher) {
                if (daysOld === 0) {
                    if (dailyNotifQueueSizeByChannelAndPublisherByHour[path] && dailyNotifQueueSizeByChannelAndPublisherByHour[path][hoursOld]) {
                        if (dailyNotifQueueSizeByChannelAndPublisherByHour[path][hoursOld] < count) {
                            updateSegmentedGraph(dailyNotifQueueSizeByChannelAndPublisherByHour, path, "" + hoursOld, count);
                        }
                    }
                    else {
                        updateSegmentedGraph(dailyNotifQueueSizeByChannelAndPublisherByHour, path, "" + hoursOld, count);
                    }
                }
            } else if (type === NotificationStatisticType.HourlyNotificationPipelineTime) {
                updateDailyAndWeeklyViews(daysOld, Math.floor((currentTime - statDate) / MSPERHOUR), count, path, dailyNotificationPipelineTimeByHour, weeklyNotificationPipelineTimeByDay);
            } else if (type === NotificationStatisticType.HourlyEventPipelineTime) {
                updateDailyAndWeeklyViews(daysOld, Math.floor((currentTime - statDate) / MSPERHOUR), count, path, dailyEventPipelineTimeByPublisherByHour, weeklyEventPipelineTimeByPublisherByDay);
            } else if (type === NotificationStatisticType.HourlyTotalPipelineTime) {
                updateDailyAndWeeklyViews(daysOld, Math.floor((currentTime - statDate) / MSPERHOUR), count, path, dailyTotalPipelineTimeByPublisherByHour, weeklyTotalPipelineTimeByPublisherByDay);
            }
        }
    }

    for (const statKey of Object.keys(tfsDataProviderStats)) {
        // the statistics are ogranized by event type.
        // so, stats["1"] contains an array of all Statistics that have a Type of 1
        const statisticArray = tfsDataProviderStats[statKey];
        for (const stat of statisticArray) {
            const { type, path, hitCount: count } = stat;
            const statDate = stat.date.getTime();
            const daysOld = Math.floor((currentTime - statDate) / MSPERDAY);
            const hoursOld = Math.floor((currentTime - statDate) / MSPERHOUR);
            const service = subscriptionStore.getDefaultServiceInstanceType();
            // The statistics returns one of type Events, one of type Notifications, and one per hour for HourlyEvents and HourlyNotifications
            // These give us the simple totals that we desire, so we can just make the hitCount this number.
            if (type === NotificationStatisticType.EventsByEventTypePerUser) {
                // Organizes the events by the publisher of the events.
                const publisher = map[path];
                if (daysOld === 0){
                    eventInitiators[publisher] = (eventInitiators[publisher] || 0) + count;
                }
            }
            else if (type === NotificationStatisticType.NotificationBySubscription || type === undefined) {
                // Somewhere, these (and only these) are giving undefined as the type. Included as work-around.
                // Possibly because 0 (the stat's enum value) is being interpreted as "no type" somewhere?

                // Organizes the notifications by the channel that creates them.
                // Note: From the path, we find the provider, using a map that was created in the SubscriptionStore
                if (count && stat.path && !stat.user && !stat.type) { // this is a second check to make sure our 'undefined' is in fact representing NotificationBySubscription
                    const channel = viewData.subscriptions[service][path].channel.type;
                    if (daysOld === 0){
                        notifChannels[channel] = (notifChannels[channel] || 0) + count;
                    }
                }
            }
        }
    }

    // transforms info into more presentable form e.g. eventInitiators[p] = x becomes "p: x"
    const hourlyEventBreakdown: string[] = [];
    const notifBreakdown: string[] = [];
    const hourlyNotifBreakdown: string[] = [];
    const eventQueueByPublisherBreakdown: string[] = [];
    const notifQueueByChannelByPublisherBreakdown: string[] = [];
    const oldestEventsByPublisherBreakdown: string[] = [];
    const oldestNotificationByChannelByPublisherBreakdown: string[] = [];
    const totalPipelineDelayTimeByChannelAndPublisherBreakdown: string[] = [];
    const notifPipelineDelayTimeByChannelAndPublisherBreakdown: string[] = [];
    const eventPipelineDelayTimeByPublisherBreakdown: string[] = [];

    for (const initiator of Object.keys(hourlyEventInitiators)) {
        hourlyEventBreakdown.push(initiator + ": " + hourlyEventInitiators[initiator]);
    }
    for (const channel of Object.keys(notifChannels)) {
        notifBreakdown.push(channel + ": " + notifChannels[channel]);
    }
    for (const channel of Object.keys(hourlyNotifChannels)) {
        hourlyNotifBreakdown.push(channel + ": " + hourlyNotifChannels[channel]);
    }
    for (const publisher of Object.keys(eventQueueByPublisher)) {
        eventQueueByPublisherBreakdown.push(publisher + ": " + eventQueueByPublisher[publisher]);
    }
    for (const channelAndPublisher of Object.keys(notifQueueByChannelByPublisher)) {
        notifQueueByChannelByPublisherBreakdown.push(channelAndPublisher + ": " + notifQueueByChannelByPublisher[channelAndPublisher]);
    }
    for (const publisher of Object.keys(oldestEventsByPublisher)) {
        oldestEventsByPublisherBreakdown.push(publisher + ": " + Math.ceil(oldestEventsByPublisher[publisher] / MSPERMINUTE));
    }
    for (const channelAndPublisher of Object.keys(oldestNotificationByChannelByPublisher)) {
        oldestNotificationByChannelByPublisherBreakdown.push(channelAndPublisher + ": " + Math.ceil(oldestNotificationByChannelByPublisher[channelAndPublisher] / MSPERMINUTE));
    }
    for (const channelAndPublisher of Object.keys(totalPipelineDelayTimeByChannelAndPublisher)) {
        totalPipelineDelayTimeByChannelAndPublisherBreakdown.push(channelAndPublisher + ": " + totalPipelineDelayTimeByChannelAndPublisher[channelAndPublisher]);
    }
    for (const channelAndPublisher of Object.keys(notifPipelineDelayTimeByChannelAndPublisher)) {
        notifPipelineDelayTimeByChannelAndPublisherBreakdown.push(channelAndPublisher + ": " + notifPipelineDelayTimeByChannelAndPublisher[channelAndPublisher]);
    }
    for (const publisher of Object.keys(eventPipelineDelayTimeByPublisher)) {
        eventPipelineDelayTimeByPublisherBreakdown.push(publisher + ": " + eventPipelineDelayTimeByPublisher[publisher]);
    }

    // determine critical condition of tiles
    const totalPipelineCondition = Math.ceil(highestTotalPipelineDelayTime.age / MSPERMINUTE) >= HIGHDELAY ? TileConditions.Critical : (
        Math.ceil(highestTotalPipelineDelayTime.age / MSPERMINUTE) <= LOWDELAY ? TileConditions.Low : TileConditions.Normal);
    const eventPipelineCondition = Math.ceil(highestEventPipelineDelayTime.age / MSPERMINUTE) >= HIGHDELAY ? TileConditions.Critical : (
        Math.ceil(highestEventPipelineDelayTime.age / MSPERMINUTE) <= LOWDELAY ? TileConditions.Low : TileConditions.Normal);
    const notificationPipelineCondition = Math.ceil(highestNotifPipelineDelayTime.age / MSPERMINUTE) >= HIGHDELAY ? TileConditions.Critical : (
        Math.ceil(highestNotifPipelineDelayTime.age / MSPERMINUTE) <= LOWDELAY ? TileConditions.Low : TileConditions.Normal);
    // send all of the calculated data to appropriate variables so they can be used.
    dailyData.push({
        head: "Events Processed",
        foot: "Last Day",
        data: "" + (eventSum > MAXDISPLAYNUMBER ? MAXDISPLAYMESSAGE : eventSum),
        hover: combineObjectKeyAndData(eventInitiators),
        shortView: false
    });
    dailyData.push({
        head: "Notifications Sent",
        foot: "Last Day",
        data: "" + (notifSum > MAXDISPLAYNUMBER ? MAXDISPLAYMESSAGE : notifSum),
        hover: combineObjectKeyAndData(notifChannels),
        shortView: false
    });
    hourlyData.push({
        head: "Events Processed",
        foot: "Last Hour",
        data: "" + (hourlyEventSum > MAXDISPLAYNUMBER ? MAXDISPLAYMESSAGE : hourlyEventSum),
        hover: hourlyEventBreakdown.join("\n"),
        shortView: true
    });
    hourlyData.push({
        head: "Notifications Sent",
        foot: "Last Hour",
        data: "" + (hourlyNotifSum > MAXDISPLAYNUMBER ? MAXDISPLAYMESSAGE : hourlyNotifSum),
        hover: hourlyNotifBreakdown.join("\n"),
        shortView: true
    });
    eventQueueSize = {
        head: "Queued Events",
        foot: mostRecentEventQueuePoll.toString(),
        data: "" + (eventQueueSum > MAXDISPLAYNUMBER ? MAXDISPLAYMESSAGE : eventQueueSum),
        hover: eventQueueByPublisherBreakdown.join("\n"),
        shortView: null
    };
    notificationQueueSize = {
        head: "Queued Notifications",
        foot: mostRecentNotificationQueuePoll.toString(),
        data: "" + (notifQueueSum > MAXDISPLAYNUMBER ? MAXDISPLAYMESSAGE : notifQueueSum),
        hover: notifQueueByChannelByPublisherBreakdown.join("\n"),
        shortView: null
    };
    oldestEventTile = {
        head: "Oldest Queued Event",
        foot: eventPublisherWithHighestDelay.source,
        data: "" + Math.ceil((eventPublisherWithHighestDelay.age / MSPERMINUTE)) + "m",
        hover: mostRecentEventDelayPoll.toString() + "\n" + oldestEventsByPublisherBreakdown.join("\n"),
        shortView: null
    };
    oldestNotificationTile = {
        head: "Oldest Queued Notif",
        foot: notifChannelPublisherWithHighestDelay.source,
        data: "" + Math.ceil((notifChannelPublisherWithHighestDelay.age / MSPERMINUTE)) + "m",
        hover: mostRecentNotificationDelayPoll.toString() + "\n" + oldestNotificationByChannelByPublisherBreakdown.join("\n"),
        shortView: null
    };
    totalPipelineTimeTile = {
        head: "Total Pipeline Time",
        foot: highestTotalPipelineDelayTime.source,
        data: "" + Math.ceil(highestTotalPipelineDelayTime.age / MSPERMINUTE) + "m",
        hover: mostRecentTotalPipelinePoll.toString() + "\n" + totalPipelineDelayTimeByChannelAndPublisherBreakdown.join("\n"),
        shortView: null,
        condition: totalPipelineCondition
    };
    notifPipelineTimeTile = {
        head: "Notif Pipeline Time",
        foot: highestNotifPipelineDelayTime.source,
        data: "" + Math.ceil(highestNotifPipelineDelayTime.age / MSPERMINUTE) + "m",
        hover: mostRecentNotificationPipelinePoll.toString() + "\n" + notifPipelineDelayTimeByChannelAndPublisherBreakdown.join("\n"),
        shortView: null,
        condition: notificationPipelineCondition
    }
    eventPipelineTimeTile = {
        head: "Event Pipeline Time",
        foot: highestEventPipelineDelayTime.source,
        data: "" + Math.ceil(highestEventPipelineDelayTime.age / MSPERMINUTE) + "m",
        hover: mostRecentEventPipelinePoll.toString() + "\n" + eventPipelineDelayTimeByPublisherBreakdown.join("\n"),
        shortView: null,
        condition: eventPipelineCondition
    };

    const type: string = "line";
    const dailyLabelData: string[] = [];
    for (let i = 0; i <= currentHour; i++) {
        dailyLabelData.push(i + ":00");
    }

    const hourlyLabelData: string[] = [];
    for (let i = 0; i <= currentSegment; i++) {
        hourlyLabelData.push(i + ":" + (currentSegment / 2) + "" + (currentSegment % 2 ? "0" : "5"));
    }

    const reverseHourlyLabelData: string[] = [];
    for (let i = 23; i >= 0; i--) {
        reverseHourlyLabelData.push("" + i);
    }
    const daysPassedLabelData: string[] = ["6", "5", "4", "3", "2", "1", "0"];

    const currentHourLabelData: string[] = ["55", "50", "45", "40", "35", "30", "25", "20", "15", "10", "5", "0"];
    
    currentHour;
    notifProcessedData[0] = {
        xTitle: "Hours Ago",
        yTitle: "Notifications Sent",
        data: createReverseGraphData(dailyNotificationDataBySubscriptionByHour, 24),
        labelValues: reverseHourlyLabelData,
        chartType: type,
        shortView: false
    };
    notifProcessedData[1] = {
        xTitle: "Days Ago",
        yTitle: "Notifications Sent",
        data: createReverseGraphData(weeklyNotificationChannelsByDay, 7),
        labelValues: daysPassedLabelData,
        chartType: type,
        shortView: true
    };
    eventsProcessedData[0] = {
        xTitle: "Hours Ago",
        yTitle: "Events Processed",
        data: createReverseGraphData(dailyEventDataByPublisherByHour, 24),
        labelValues: reverseHourlyLabelData,
        chartType: type,
        shortView: false
    };
    eventQueueData[0] = {
        xTitle: "Hours Ago",
        yTitle: "Event Queue Size",
        data: createReverseGraphData(dailyEventQueueSizeByPublisherByHour, 24),
        labelValues: reverseHourlyLabelData,
        chartType: type,
        shortView: false
    };
    eventQueueData[1] = {
        xTitle: "Minutes Ago",
        yTitle: "Event Queue Size",
        data: createReverseGraphData(hourlyEventQueueSizeByPublisherByGranularity, 60 / GRANULARITY),
        labelValues: currentHourLabelData,
        chartType: type,
        shortView: true
    };
    notifQueueData[0] = {
        xTitle: "Hours Ago",
        yTitle: "Notification Queue Size",
        data: createReverseGraphData(dailyNotifQueueSizeByChannelAndPublisherByHour, 24),
        labelValues: reverseHourlyLabelData,
        chartType: type,
        shortView: false
    };
    notifQueueData[1] = {
        xTitle: "Minutes Ago",
        yTitle: "Notification Queue Size",
        // segments = number of grains per hour
        data: createReverseGraphData(hourlyNotifQueueSizeByPublisherByGranularity, 60 / GRANULARITY),
        labelValues: currentHourLabelData,
        chartType: type,
        shortView: true
    };
    notifPipelineData[0] = {
        xTitle: "Hours Ago",
        yTitle: "Highest Notification Delay (Minutes)",
        data: createReverseGraphData(dailyNotificationPipelineTimeByHour, 24),
        labelValues: reverseHourlyLabelData,
        chartType: type,
        shortView: true
    };
    notifPipelineData[1] = {
        xTitle: "Days Ago",
        yTitle: "Highest Notification Delay (Minutes)",
        data: createReverseGraphData(weeklyNotificationPipelineTimeByDay, 7),
        labelValues: daysPassedLabelData,
        chartType: type,
        shortView: false
    };
    totalPipelineData[0] = {
        xTitle: "Hours Ago",
        yTitle: "Highest Total Pipeline Time (Minutes)",
        data: createReverseGraphData(dailyTotalPipelineTimeByPublisherByHour, 24),
        labelValues: reverseHourlyLabelData,
        chartType: type,
        shortView: true,
    };
    totalPipelineData[1] = {
        xTitle: "Days Ago",
        yTitle: "Highest Total Pipeline Time (Minutes)",
        data: createReverseGraphData(weeklyTotalPipelineTimeByPublisherByDay, 7),
        labelValues: daysPassedLabelData,
        chartType: type,
        shortView: false,
    };
    eventPipelineData[0] = {
        xTitle: "Hours Ago",
        yTitle: "Highest Event Pipeline Time (Minutes)",
        data: createReverseGraphData(dailyEventPipelineTimeByPublisherByHour, 24),
        labelValues: reverseHourlyLabelData,
        chartType: type,
        shortView: true,
    };
    eventPipelineData[1] = {
        xTitle: "Days Ago",
        yTitle: "Highest Event Pipeline Time (Minutes)",
        data: createReverseGraphData(weeklyEventPipelineTimeByPublisherByDay, 7),
        labelValues: daysPassedLabelData,
        chartType: type,
        shortView: false,
    }
}

/**
 * Represents a single tile that will render some form of statistic.
 * @class
 * @extends React.Component
 */
class NotificationStatisticTile extends React.Component<ITileProps, {}>{

    private _tileElem: HTMLElement;

    constructor(props) {
        super(props);
    }

    public render() {
        let name: string = "notification-statistic-tile ";
        if (this.props.condition) {
            if (this.props.condition === TileConditions.Low) {
                name += "low";
            } else if (this.props.condition === TileConditions.Critical) {
                name += "critical";
            }
        }
        return (
            <div tabIndex={0}>
                <TooltipHost tabIndex={0} content={this.props.hover}>
                    <div className={name}>
                        <div tabIndex={0}className="notification-statistic-title">{this.props.head}</div>
                        <div tabIndex={0}className="notification-statistic-data">{this.props.data}</div>
                        <div tabIndex={0}>{this.props.foot}</div>
                    </div>
                </TooltipHost>
            </div>
        );
    }
}

class NotificationStatisticGraph extends React.Component<IGraphProps, {}>{
    constructor(props) {
        super(props);
    }

    public render() {
        return (
            <div className="notification-statistic-graph">
                <Charts.ChartComponent chartOptions={{ yAxis: { title: this.props.yTitle, allowDecimals: false }, xAxis: { title: this.props.xTitle, allowDecimals: false, labelValues: this.props.labelValues }, chartType: this.props.chartType, series: this.props.data }} />
            </div>
        );
    }
}

/**
 * Renders the group of all notification statistic tiles.
 * The State of this object is used to control the Props of the individual tiles
 * @class
 */
export class NotificationStatisticTiles extends React.Component<IStatisticTilesProperties, ITileStates>{

    private _statisticStore;

    /**
     * Sets the initial state, which controls the props of the children tiles.
     * @param props
     */
    constructor(props) {
        super(props);
        this._statisticStore = new NotificationStatisticStore(this.props.subscriptionStore.getCommonViewData());
        NotificationStatisticAction.statisticTabOpened();
    }

    public componentDidMount() {
        this._statisticStore.addChangedListener(this.retrieveStatistics);
    }

    @autobind
    private retrieveStatistics() {
        initializeNotificationStatisticData(this.props.subscriptionStore, this._statisticStore);
        this.setState({
            processedEventTile: hourlyData[0],
            processedNotificationTile: hourlyData[1]
        });
    }
    public componentWillUnmount() {
        this._statisticStore.removeChangedListener(this.retrieveStatistics);
    }

    /**
     * This function swaps out the data that will be displayed to the user. It currently lets data be displayed in a shorter view or a longer one.
     * The Delay tile is a WIP, so right now it has no changes being made to it.
     */
    @autobind
    changeTileState() {
        const results = this.state.processedEventTile.shortView ? dailyData : hourlyData;
        const eventState = results[0];
        const notificationState = results[1];
        this.setState({
            processedEventTile: {
                data: eventState.data,
                head: eventState.head,
                foot: eventState.foot,
                hover: eventState.hover,
                shortView: eventState.shortView
            },
            processedNotificationTile: {
                head: notificationState.head,
                foot: notificationState.foot,
                hover: notificationState.hover,
                data: notificationState.data,
                shortView: notificationState.shortView
            },
        });
    }

    /**
     * Renders all tiles and graphs related to consuming the statistic data. Also contains Toggles to allow switching the length of data sets.
     *
     */
    public render() {
        let items = null;
        if (this.state) {
            items = <div>
                <Toggle onText="Outgoing Events and Notifications: Short-Term Data" offText="Outgoing Events and Notifications: Long-Term Data" defaultChecked={true} onChanged={this.changeTileState} />
                <div className="notification-statistic-tiles">
                    <NotificationStatisticTile
                        head={this.state.processedEventTile.head}
                        foot={this.state.processedEventTile.foot}
                        data={this.state.processedEventTile.data}
                        hover={this.state.processedEventTile.hover}
                        shortView={this.state.processedEventTile.shortView}
                    />
                    <NotificationStatisticTile
                        head={this.state.processedNotificationTile.head}
                        foot={this.state.processedNotificationTile.foot}
                        data={this.state.processedNotificationTile.data}
                        hover={this.state.processedNotificationTile.hover}
                        shortView={this.state.processedNotificationTile.shortView}
                    />
                    <NotificationStatisticTile
                        head={eventQueueSize.head}
                        foot={eventQueueSize.foot}
                        data={eventQueueSize.data}
                        hover={eventQueueSize.hover}
                        shortView={eventQueueSize.shortView}
                    />
                    <NotificationStatisticTile
                        head={oldestEventTile.head}
                        foot={oldestEventTile.foot}
                        data={oldestEventTile.data}
                        hover={oldestEventTile.hover}
                        shortView={oldestEventTile.shortView}
                    />
                    <NotificationStatisticTile
                        head={notificationQueueSize.head}
                        foot={notificationQueueSize.foot}
                        data={notificationQueueSize.data}
                        hover={notificationQueueSize.hover}
                        shortView={notificationQueueSize.shortView}
                    />
                    <NotificationStatisticTile
                        head={oldestNotificationTile.head}
                        foot={oldestNotificationTile.foot}
                        data={oldestNotificationTile.data}
                        hover={oldestNotificationTile.hover}
                        shortView={oldestNotificationTile.shortView}
                    />
                    <NotificationStatisticTile
                        head={totalPipelineTimeTile.head}
                        foot={totalPipelineTimeTile.foot}
                        data={totalPipelineTimeTile.data}
                        hover={totalPipelineTimeTile.hover}
                        shortView={totalPipelineTimeTile.shortView}
                        condition={totalPipelineTimeTile.condition}
                    />
                    <NotificationStatisticTile
                        head={notifPipelineTimeTile.head}
                        foot={notifPipelineTimeTile.foot}
                        data={notifPipelineTimeTile.data}
                        hover={notifPipelineTimeTile.hover}
                        shortView={notifPipelineTimeTile.shortView}
                        condition={notifPipelineTimeTile.condition}
                    />
                    <NotificationStatisticTile
                        head={eventPipelineTimeTile.head}
                        foot={eventPipelineTimeTile.foot}
                        data={eventPipelineTimeTile.data}
                        hover={eventPipelineTimeTile.hover}
                        shortView={eventPipelineTimeTile.shortView}
                        condition={eventPipelineTimeTile.condition}
                    />
                </div>
                <div>
                    <NotificationStatisticChartRenderer />
                </div>
            </div>;
        }

        return (
            <div>
                {items}
            </div>
        );
    }
}

/**
 * @function createGraphData
 * @param statisticBreakdown
 * @param segments
 * Makes a graph based on the data breakdown and the number of desired segments.
 */
function createGraphData(statisticBreakdown: { [key: string]: { [key: string]: number } }, segments: number): DataSeries[] {
    const result: DataSeries[] = [];
    for (const key in statisticBreakdown) {
        const curData: number[] = [];
        const objData = statisticBreakdown[key];

        for (let i = 0; i <= segments; i++) {
            curData[i] = objData[i] || 0;
        }

        result.push({ name: key, data: curData });
    }

    return result;
}

/**
 * @function createReverseGraphData
 * @param statisticBreakdown
 * @param segments
 * Similar to the createGraphData function, but places the data in the opposite order of segments
 * This is used when the data is left-handed (earliest data first) but the right side of the graph lower-numbered (e.g. "4 Hours Ago, 3 hours ago, ..." vs "8 AM, 9 AM, ...")
 */
function createReverseGraphData(statisticBreakdown: { [key: string]: { [key: string]: number } }, segments: number): DataSeries[] {
    const result: DataSeries[] = [];
    for (const key in statisticBreakdown) {
        const curData: number[] = [];
        const objData = statisticBreakdown[key];
        for (let i = segments - 1; i >= 0; i--) {
            curData[i] = objData[segments - i - 1] || 0;
        }
        result.push({ name: key, data: curData });
    }
    return result;
}

class NotificationStatisticChartRenderer extends React.Component<{}, IGraphStates>{
    constructor(props) {
        super(props);
        this.state = {
            eventProcessedGraph: eventsProcessedData[0],
            notificationProcessedGraph: notifProcessedData[0],
            eventQueueGraph: eventQueueData[0],
            notifQueueGraph: notifQueueData[0],
            notificationPipelineGraph: notifPipelineData[0],
            eventPipelineGraph: eventPipelineData[0],
            totalPipelineGraph: totalPipelineData[0]
        }
    }

    @autobind
    changeGraphState() {
        const short = this.state.eventQueueGraph.shortView;
        const notifSentData = short ? notifProcessedData[0] : notifProcessedData[1];
        const eventQueueSizeData = short ? eventQueueData[0] : eventQueueData[1];
        const notifQueueSizeData = short ? notifQueueData[0] : notifQueueData[1];
        const ePipelineData = short ? eventPipelineData[0] : eventPipelineData[1];
        const nPipelineData = short ? notifPipelineData[0] : notifPipelineData[1];
        const tPipelineData = short ? totalPipelineData[0] : totalPipelineData[1];
        this.setState({
            notificationProcessedGraph: notifSentData,
            eventQueueGraph: eventQueueSizeData,
            notifQueueGraph: notifQueueSizeData,
            eventPipelineGraph: ePipelineData,
            notificationPipelineGraph: nPipelineData,
            totalPipelineGraph: tPipelineData,
        });
    }

    public render(){
        return (
            <div>
                <Toggle onText="Graphs: Default View" offText="Graphs: Alternative View" defaultChecked={true} onChanged={this.changeGraphState} />
                <div className="notification-statistic-graphs">
                    <NotificationStatisticGraph
                        xTitle={this.state.totalPipelineGraph.xTitle}
                        yTitle={this.state.totalPipelineGraph.yTitle}
                        labelValues={this.state.totalPipelineGraph.labelValues}
                        chartType={this.state.totalPipelineGraph.chartType}
                        data={this.state.totalPipelineGraph.data}
                        shortView={this.state.totalPipelineGraph.shortView}
                    />
                    <NotificationStatisticGraph
                        xTitle={this.state.notificationPipelineGraph.xTitle}
                        yTitle={this.state.notificationPipelineGraph.yTitle}
                        labelValues={this.state.notificationPipelineGraph.labelValues}
                        chartType={this.state.notificationPipelineGraph.chartType}
                        data={this.state.notificationPipelineGraph.data}
                        shortView={this.state.notificationPipelineGraph.shortView}
                    />
                    <NotificationStatisticGraph
                        xTitle={this.state.eventPipelineGraph.xTitle}
                        yTitle={this.state.eventPipelineGraph.yTitle}
                        labelValues={this.state.eventPipelineGraph.labelValues}
                        chartType={this.state.eventPipelineGraph.chartType}
                        data={this.state.eventPipelineGraph.data}
                        shortView={this.state.eventPipelineGraph.shortView}
                    />
                </div>
                <div className="notification-statistic-graphs">
                    <NotificationStatisticGraph
                        xTitle={this.state.eventProcessedGraph.xTitle}
                        yTitle={this.state.eventProcessedGraph.yTitle}
                        labelValues={this.state.eventProcessedGraph.labelValues}
                        chartType={this.state.eventProcessedGraph.chartType}
                        data={this.state.eventProcessedGraph.data}
                        shortView={this.state.eventProcessedGraph.shortView}
                    />
                    <NotificationStatisticGraph
                        xTitle={this.state.notificationProcessedGraph.xTitle}
                        yTitle={this.state.notificationProcessedGraph.yTitle}
                        labelValues={this.state.notificationProcessedGraph.labelValues}
                        chartType={this.state.notificationProcessedGraph.chartType}
                        data={this.state.notificationProcessedGraph.data}
                        shortView={this.state.eventProcessedGraph.shortView}
                    />
                    <NotificationStatisticGraph
                        xTitle={this.state.eventQueueGraph.xTitle}
                        yTitle={this.state.eventQueueGraph.yTitle}
                        labelValues={this.state.eventQueueGraph.labelValues}
                        chartType={this.state.eventQueueGraph.chartType}
                        data={this.state.eventQueueGraph.data}
                        shortView={this.state.eventQueueGraph.shortView}
                    />
                    <NotificationStatisticGraph
                        xTitle={this.state.notifQueueGraph.xTitle}
                        yTitle={this.state.notifQueueGraph.yTitle}
                        labelValues={this.state.notifQueueGraph.labelValues}
                        chartType={this.state.notifQueueGraph.chartType}
                        data={this.state.notifQueueGraph.data}
                        shortView={this.state.notifQueueGraph.shortView}
                    />
                </div>
            </div>
        )
    }
}