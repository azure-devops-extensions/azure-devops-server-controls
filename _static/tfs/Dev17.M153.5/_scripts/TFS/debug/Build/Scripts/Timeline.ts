import { TimelineRecord, TaskReference } from "TFS/Build/Contracts";

export class TimelineHelper {
    public static getAllTaskIds(records: TimelineRecord[]): string[] {
        const tasks = TimelineHelper._getAllTasks(records);
        return tasks.map(x => x.id.toLowerCase());
    }

    private static _getAllTasks(records: TimelineRecord[]): TaskReference[] {
        let tasksMap: IDictionaryStringTo<TaskReference> = {};
        let tasks: TaskReference[] = [];
        (records || []).forEach((record) => {
            const task = record && record.task;
            if (task && !tasksMap[task.id]) {
                tasksMap[task.id] = task;
                tasks.push(task);
            }
        });

        return tasks;
    }
}