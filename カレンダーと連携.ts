const NOTION_REQUEST_HEADERS = {
	"Content-type": "application/json",
	Authorization: "Bearer " + MY_NOTION_TOKEN,
	"Notion-Version": "2022-02-22",
};

const TaskData = class {
	taskName: string;
	className: string;
	dueDate: Date;
	description: string;

	constructor(taskName: string, className: string, dueDate: Date, description: string = "") {
		this.taskName = taskName;
		this.className = className;
		this.dueDate = dueDate;
		this.description = description;
	}

	getEventTitle() {
		return this.taskName + "【" + this.className + "】";
	}

	getDueISOJp() {
		const dateCopy = new Date(this.dueDate);
		dateCopy.setHours(dateCopy.getHours() + 9);
		const dateString = dateCopy.toISOString();
		const formattedDateString = dateString.replace("Z", "+09:00");
		return formattedDateString;
	}

	getDueMicrosecondString() {
		return this.dueDate.getTime().toString();
	}
};

/**カレンダーからイベントを取得 */
function findEvents() {
	const zeroTime = new Date(0);
	const futureTime = new Date(2100, 0);
	const events = todoCalendar.getEvents(zeroTime, futureTime);
	return events;
}

type NotionTaskProperties = {
	授業名: { select: { id?: string; name: string } };
	締切日時: { date: { start: string; time_zone?: string } };
	チェック?: { checkbox: boolean };
	URL?: { url: string };
	実行日?: { date: string };
	課題: { title: { text: { content: string } }[] };
};

type NotionTask = { object: string; id: string; url: string; properties: NotionTaskProperties };

/**Notionから課題を取得 */
function getTasksFromNotion(payload: object) {
	const url = `https://api.notion.com/v1/databases/${DATABASE_ID}/query`;
	const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
		method: "post",
		headers: NOTION_REQUEST_HEADERS,
		payload: JSON.stringify(payload),
	};
	const res = UrlFetchApp.fetch(url, options);
	const resStr: string = res.toString();
	const resJson = JSON.parse(resStr);
	const tasks: NotionTask[] = resJson["results"];
	return tasks;
}

/**課題のデータを辞書に格納 */
function createTaskData(task: NotionTask) {
	const title = task["properties"]["課題"]["title"][0]["text"]["content"];
	const dueDate = new Date(task["properties"]["締切日時"]["date"]["start"]);
	const className = task["properties"]["授業名"]["select"]["name"];
	let url = "";
	if (task.properties.URL) {
		url = task.properties.URL.url;
	}
	const taskData = new TaskData(title, className, dueDate, url);
	return taskData;
}

/**イベントのタイトルと開始日時のリストを作成 */
const createEventData = (event: GoogleAppsScript.Calendar.CalendarEvent) => {
	const title = event.getTitle();
	const taskName = title.replace(/【[月火水木金][１-５].*】$/, "");
	const classNameMatch = title.match(/【([月火水木金][１-５].*)】/);
	if (!classNameMatch) {
		throw new Error("カレンダーイベントのタイトルが不適切です\n【】の中に授業名を入れましょう");
	}
	const className = classNameMatch[1];
	const dueDate = new Date(<Date>event.getStartTime());
	const description = event.getDescription();
	return new TaskData(taskName, className, dueDate, description);
};

/**イベントのタイトルと開始日時のリストを作成 */
function createEventDataList(events: GoogleAppsScript.Calendar.CalendarEvent[]) {
	const eventTaskDataList = events.map((event) => createEventData(event));
	return eventTaskDataList;
}

/**Notionにあってカレンダーに存在しない課題をカレンダーに追加 */
function createEvents(existEvents: GoogleAppsScript.Calendar.CalendarEvent[], tasks: NotionTask[]) {
	const eventDataLists = createEventDataList(existEvents);
<<<<<<< HEAD
	const uncheckedTasks = tasks.filter((task) => !task.properties.チェック?.checkbox);
	for (let task of uncheckedTasks) {
=======
	for (let task of tasks) {
>>>>>>> 4c818676dae475400425fda90affdde942cfe00f
		const taskData = createTaskData(task);
		const eventTitle = taskData.getEventTitle();
		const existEventDataSame = eventDataLists.filter(
			(data) => data.getEventTitle() === eventTitle && data.dueDate.toString() === taskData.dueDate.toString(),
		);
		// 課題がカレンダーに存在していたらスキップする（カレンダーの名前と締切日時が一致するものがあったらスキップ）
		if (existEventDataSame.length > 0) {
			continue;
		}
		const startTime = taskData.dueDate;
		const endTime = new Date(startTime);
		endTime.setMinutes(endTime.getMinutes() + 30);
		const option = { description: taskData.description };
		const newEvent = todoCalendar.createEvent(eventTitle, startTime, endTime, option);
		newEvent.addPopupReminder(60);
		newEvent.addPopupReminder(60 * 24);
		Logger.log(eventTitle + "をカレンダーに追加しました");
	}
}

/**カレンダーにあってNotionにない課題をNotionに追加 */
const createNotionTask = (existEvents: GoogleAppsScript.Calendar.CalendarEvent[], tasks: NotionTask[]) => {
	const notionDataList = tasks.map((task) => createTaskData(task));
	const url = `https://api.notion.com/v1/pages`;
	for (let event of existEvents) {
		const eventData = createEventData(event);
		const notionDataSame = notionDataList.filter((data) => {
			return data.taskName === eventData.taskName && data.dueDate.toString() === eventData.dueDate.toString();
		});
		// イベントがNotionに存在していたらスキップする
		if (notionDataSame.length > 0) {
			continue;
		}
		const properties: NotionTaskProperties = {
			課題: { title: [{ text: { content: eventData.taskName } }] },
			授業名: { select: { name: eventData.className } },
			締切日時: { date: { start: eventData.getDueISOJp() } },
		};
		const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
			method: "post",
			headers: NOTION_REQUEST_HEADERS,
			payload: JSON.stringify({ parent: { database_id: DATABASE_ID }, properties: properties }),
		};
		UrlFetchApp.fetch(url, options);
	}
};

/**チェックの付いたNotionのタスクを削除 */
function deleteChecked() {
	const payload = { filter: { property: "チェック", checkbox: { equals: true } } };
	const checkedTasks = getTasksFromNotion(payload);

	const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
		method: "patch",
		headers: NOTION_REQUEST_HEADERS,
		payload: JSON.stringify({ archived: true }),
	};
	for (let checkedTask of checkedTasks) {
		// Notionから削除
		const id = checkedTask.id;
		const url = "https://api.notion.com/v1/pages/" + id;
		UrlFetchApp.fetch(url, options);
	}
}

/** Notionにないカレンダーイベントを削除する */
const deleteCalendarEvent = (existEvents: GoogleAppsScript.Calendar.CalendarEvent[], tasks: NotionTask[]) => {
	const notionDataList = tasks.map((task) => createTaskData(task));
	const notionTaskTitleAndDues = notionDataList.map(
		(taskData) => [taskData.taskName, taskData.getDueMicrosecondString()].toString(),
	);
	for (let event of existEvents) {
		const eventData = createEventData(event);
		// カレンダーのタスクがNotionに存在しなかったら
		if (!notionTaskTitleAndDues.includes([eventData.taskName, eventData.getDueMicrosecondString()].toString())) {
			event.deleteEvent();
			Logger.log(eventData.taskName + "をカレンダーから削除しました");
		}
	}
};

/**定期実行する関数 */
function syncNotion() {
	const existEvents = findEvents();
	const payload = {
		filter: {
			and: [{ property: "課題", title: { is_not_empty: true } }, { property: "チェック", checkbox: { equals: false } }],
		},
	};
	const tasks = getTasksFromNotion(payload);
	createEvents(existEvents, tasks);
  deleteChecked()
	// createNotionTask(existEvents, tasks);
	// deleteEvents(existEvents, tasks);
}
