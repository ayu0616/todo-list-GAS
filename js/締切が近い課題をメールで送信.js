// Compiled using todo-list 1.0.0 (TypeScript 4.5.4)
"use strict";
/**締切が2日以内の課題を収集する */
function getAssignment() {
    // 現在時刻
    const now = new Date();
    // 明後日の23:59
    const dayAfterTomorrow = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 2);
    // カレンダーからイベントを取得
    const events = todoCalendar.getEvents(now, dayAfterTomorrow);
    return events;
}
/**締切までの相対日時を取得 */
function getAsmDue(event) {
    const due = event.getStartTime();
    // 締切までのミリ秒を取得
    const relativeMilliseconds = due.getTime() - Date.now();
    // 単位当たりのミリ秒を計算
    const minuteMillisecond = 1000 * 60;
    const hourMillisecond = minuteMillisecond * 60;
    const dayMillisecond = hourMillisecond * 24;
    // 締切まで何日、何時間、何分か
    const relativeDay = Math.floor(relativeMilliseconds / dayMillisecond);
    const relativeHour = Math.floor((relativeMilliseconds - relativeDay * dayMillisecond) / hourMillisecond);
    const relativeMinute = Math.floor((relativeMilliseconds - (relativeDay * dayMillisecond + relativeHour * hourMillisecond)) / minuteMillisecond);
    const dueRelativeStr = `${relativeDay}日${relativeHour}時間${relativeMinute}分`;
    return dueRelativeStr;
}
/**本文を作成 */
function createBodyMessage() {
    // イベントを取得
    const events = getAssignment();
    // イベントが存在しない場合「2日以内に締め切りがある課題は存在しません」と返す
    if (events.length === 0) {
        return "2日以内に締め切りがある課題は存在しません";
    }
    // 各イベントごとに本文を作成
    const statements = [];
    for (let event of events) {
        // タイトルを取得
        const asmTitle = event.getTitle();
        // 締切を取得
        const asmDue = getAsmDue(event);
        // 説明を取得
        const desc = event.getDescription();
        const statementArray = new Array(asmTitle, `締切まで${asmDue}`, desc);
        const statement = statementArray.join("\n");
        statements.push(statement);
    }
    // 本文を作成
    const bodyMessage = statements.join("\n\n");
    return bodyMessage;
}
/**メールを送信する */
function send() {
    const recipient = "ayumu_ogw@icloud.com";
    const subject = "2日以内に締切を迎える課題";
    const body = createBodyMessage();
    const options = {
        name: "締切が2日以内の課題を収集するプログラム",
    };
    GmailApp.sendEmail(recipient, subject, body, options);
}
/**Discordに送信する */
const sendDiscord = () => {
    const url = "https://discord.com/api/webhooks/958291954590949386/K8UUWptVGD7hADyglLU9maAlUvL4C4vKYGBIdpQQm6GPANF8irHVwH7IwnjpzkjfYkPx";
    const message = createBodyMessage();
    const body = {
        content: message,
        avatar_url: "https://pbs.twimg.com/profile_images/1048038628314644485/6L9sIvPC_400x400.jpg",
    };
    const options = {
        method: "post",
        payload: body,
    };
    const res = UrlFetchApp.fetch(url, options);
    Logger.log(res);
};
