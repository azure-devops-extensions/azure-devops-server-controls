import * as StoreBase from "VSS/Flux/Store";
import * as NotificationStatisticActions from "NotificationsUI/Scripts/Actions/NotificationStatisticAction";
import * as NotificationRestClient from "Notifications/RestClient";
import * as Service from "VSS/Service";
import * as Q from "q";
import { NotificationCommonViewData, NotificationStatistic, NotificationStatisticType, NotificationStatisticsQuery, NotificationStatisticsQueryConditions } from "Notifications/Contracts";
import { autobind } from "OfficeFabric/Utilities";

export class NotificationStatisticStore extends StoreBase.RemoteStore {

    private _commonViewData: NotificationCommonViewData;
    private _queryResults: NotificationStatistic[][] = [[]];

    constructor(viewData: NotificationCommonViewData) {
        super();
        this._commonViewData = viewData;
        NotificationStatisticActions.StatisticTabOpened.addListener(this.queryData);
    }

    @autobind
    private queryData(): void {
        // The query has been broken down into several different types so they can be easily relocated later on if we decide to break down when we retrieve different types of data
        const httpClient = this._getHttpClientForService();

        const end = new Date();
        const oneDayAgo = new Date(end.getDate() - 1);
        const oneWeekAgo = new Date(end.getDate() - 7);

        const queryPromises: IPromise<void>[] = [];

        queryPromises.push(this.queryTileData(end, oneDayAgo, oneWeekAgo, httpClient));

        const totalPipelineGraphQueryConditions: NotificationStatisticsQueryConditions[] = [];
        totalPipelineGraphQueryConditions.push({ endDate: end, hitCountMinimum: null, path: null, startDate: oneDayAgo, type: NotificationStatisticType.TotalPipelineTime, user: null });
        totalPipelineGraphQueryConditions.push({ endDate: end, hitCountMinimum: null, path: null, startDate: oneWeekAgo, type: NotificationStatisticType.HourlyTotalPipelineTime, user: null });
        const tPipelineQuery: NotificationStatisticsQuery = { conditions: totalPipelineGraphQueryConditions };
        queryPromises.push(httpClient.queryStatistics(tPipelineQuery).then(
            (r: NotificationStatistic[]) => {
                this._queryResults.push(r);
            }
        ));

        const notificationPipelineQueryConditions: NotificationStatisticsQueryConditions[] = [];
        notificationPipelineQueryConditions.push({ endDate: end, hitCountMinimum: null, path: null, startDate: oneWeekAgo, type: NotificationStatisticType.HourlyNotificationPipelineTime, user: null });
        notificationPipelineQueryConditions.push({ endDate: end, hitCountMinimum: null, path: null, startDate: oneDayAgo, type: NotificationStatisticType.NotificationPipelineTime, user: null });
        const nPipelineQuery: NotificationStatisticsQuery = { conditions: notificationPipelineQueryConditions };
        queryPromises.push(httpClient.queryStatistics(nPipelineQuery).then(
            (r: NotificationStatistic[]) => {
                this._queryResults.push(r);
            }
        ));

        const eventPipelineQueryConditions: NotificationStatisticsQueryConditions[] = [];
        eventPipelineQueryConditions.push({ endDate: end, hitCountMinimum: null, path: null, startDate: oneDayAgo, type: NotificationStatisticType.EventPipelineTime, user: null });
        eventPipelineQueryConditions.push({ endDate: end, hitCountMinimum: null, path: null, startDate: oneWeekAgo, type: NotificationStatisticType.HourlyEventPipelineTime, user: null });
        const ePipelineQuery: NotificationStatisticsQuery = { conditions: eventPipelineQueryConditions };
        queryPromises.push(httpClient.queryStatistics(ePipelineQuery).then(
            (r: NotificationStatistic[]) => {
                this._queryResults.push(r);
            }
        ));

        const eventQueueGraphQueryConditions: NotificationStatisticsQueryConditions[] = [];
        eventQueueGraphQueryConditions.push({ endDate: end, hitCountMinimum: null, path: null, startDate: oneDayAgo, type: NotificationStatisticType.UnprocessedEventsByPublisher, user: null });
        eventQueueGraphQueryConditions.push({ endDate: end, hitCountMinimum: null, path: null, startDate: oneWeekAgo, type: NotificationStatisticType.HourlyUnprocessedEventsByPublisher, user: null });
        const eQueueQuery: NotificationStatisticsQuery = { conditions: eventQueueGraphQueryConditions };
        queryPromises.push(httpClient.queryStatistics(eQueueQuery).then(
            (r: NotificationStatistic[]) => {
                this._queryResults.push(r);
            }
        ));
        
        const notificationQueueGraphQueryConditions: NotificationStatisticsQueryConditions[] = [];
        notificationQueueGraphQueryConditions.push({ endDate: end, hitCountMinimum: null, path: null, startDate: oneDayAgo, type: NotificationStatisticType.UnprocessedNotificationsByChannelByPublisher, user: null });
        notificationQueueGraphQueryConditions.push({ endDate: end, hitCountMinimum: null, path: null, startDate: oneWeekAgo, type: NotificationStatisticType.HourlyUnprocessedNotificationsByChannelByPublisher, user: null });
        const nQueueQuery: NotificationStatisticsQuery = { conditions: notificationQueueGraphQueryConditions };
        queryPromises.push(httpClient.queryStatistics(nQueueQuery).then(
            (r: NotificationStatistic[]) => {
                this._queryResults.push(r);
            }
        ));

        // The Path of these statistics hold subscription id and event type
        // Previously, these were mapped in the data provider and displayed by channel and publisher
        // However, due to performance issues, new types will be added that directly have this information and replace these
        // These are queried temporarily to at least provide some sort of information in the meantime
        const hourlyProcessedQueryConditions: NotificationStatisticsQueryConditions[] = [];
        hourlyProcessedQueryConditions.push({ endDate: end, hitCountMinimum: null, path: null, startDate: oneDayAgo, type: NotificationStatisticType.HourlyNotificationBySubscription, user: null });
        hourlyProcessedQueryConditions.push({ endDate: end, hitCountMinimum: null, path: null, startDate: oneDayAgo, type: NotificationStatisticType.HourlyEventsByEventTypePerUser, user: null });
        const outgoingQuery: NotificationStatisticsQuery = { conditions: hourlyProcessedQueryConditions };
        queryPromises.push(httpClient.queryStatistics(outgoingQuery).then(
            (r: NotificationStatistic[]) => {
                this._queryResults.push(r);
            }
        ));


        Q.all(queryPromises).finally(() => {
            this.emitChanged()
        });


    }

    public queryTileData(end: Date, oneDayAgo: Date, oneWeekAgo: Date, httpClient: NotificationRestClient.NotificationHttpClient) {
        const tileQueryConditions: NotificationStatisticsQueryConditions[] = [];
        tileQueryConditions.push({ endDate: end, hitCountMinimum: null, path: null, startDate: oneDayAgo, type: NotificationStatisticType.UnprocessedEventDelayByPublisher, user: null });
        tileQueryConditions.push({ endDate: end, hitCountMinimum: null, path: null, startDate: oneDayAgo, type: NotificationStatisticType.UnprocessedNotificationDelayByChannelByPublisher, user: null });
        tileQueryConditions.push({ endDate: end, hitCountMinimum: null, path: null, startDate: oneWeekAgo, type: NotificationStatisticType.HourlyUnprocessedEventDelayByPublisher, user: null });
        tileQueryConditions.push({ endDate: end, hitCountMinimum: null, path: null, startDate: oneWeekAgo, type: NotificationStatisticType.HourlyUnprocessedNotificationDelayByChannelByPublisher, user: null });
        tileQueryConditions.push({ endDate: end, hitCountMinimum: null, path: null, startDate: oneDayAgo, type: NotificationStatisticType.HourlyEvents, user: null });
        tileQueryConditions.push({ endDate: end, hitCountMinimum: null, path: null, startDate: oneDayAgo, type: NotificationStatisticType.HourlyNotifications, user: null });
        const tileQuery: NotificationStatisticsQuery = { conditions: tileQueryConditions };
        return httpClient.queryStatistics(tileQuery).then(
            (r: NotificationStatistic[]) => {
                this._queryResults.push(r);
            }
        );
    }

    public queryTotalPipelineGraphData
    public getQueryResults(): NotificationStatistic[][] {
        return this._queryResults.slice();
    }

    private _getHttpClientForService(serviceInstanceId?: string): NotificationRestClient.NotificationHttpClient {
        if (!serviceInstanceId) {
            serviceInstanceId = this._commonViewData.defaultServiceInstanceType;
        }

        return Service.getClient(NotificationRestClient.NotificationHttpClient, undefined, serviceInstanceId);
    }
}