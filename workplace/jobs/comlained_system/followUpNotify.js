/**
 * Checks for solutions with follow-up dates matching today's date.
 * @returns {Array} List of follow-ups due today
 */
function checkTodayFollowups() {
    const sheet = getOrCreateSheet();
    const dataRange = sheet.getDataRange();
    const data = dataRange.getValues();
    const todayStr = formatDate(new Date());

    const followupsDueToday = [];

    for (let i = 1; i < data.length; i++) {
        const status = data[i][13]; // Assuming status is in column 14 (index 13)
        if (status === 'closed') {
            continue; // Skip closed complaints
        }
        const row = data[i];
        const solutionsStr = row[12];
        const solutions = parseSolutionsJson(solutionsStr);

        for (let j = 0; j < solutions.length; j++) {
            const solution = solutions[j];
            if (solution.date) {
                const followUpDateStr = formatDate(new Date(solution.date));
                if (followUpDateStr === todayStr) {
                    followupsDueToday.push({
                        complainId: row[0],
                        solutionId: solution.id,
                        text: solution.text,
                        team: solution.team,
                        rep: solution.rep,
                        date: solution.date
                    });
                }
            }
        }
    }

    return followupsDueToday;
}

function daiySendFollowUpNotifications() {
    try {
        const followups = checkTodayFollowups();
        if (followups.length === 0) {
            console.log('No follow-ups due today.');
            return;
        }

        // followups = followups.map(followup => {
        //     const text = `🔔 แจ้งเตือนติดตามผล Complain ID: ${followup.complainId}\n\n` +
        //                     `แนวทางแก้ไข: ${followup.text}\n` +
        //                     `ทีมที่รับผิดชอบ: ${followup.team}\n` +
        //                     `ตัวแทนทีม: ${followup.rep}\n` +
        //                     `วันที่ติดตามผล: ${formatDate(new Date(followup.date))}\n\n` +
        //                     `กรุณาดำเนินการติดตามผลตามแนวทางแก้ไขที่ระบุไว้`;

        //     sendGoogleChatText(text);
        // });
        for (let i = 0; i < followups.length; i++) {
            const followup = followups[i];
            const text = `🔔 แจ้งเตือนติดตามผล Complain ID: ${followup.complainId}\n\n` +
                `แนวทางแก้ไข: ${followup.text}\n` +
                `ทีมที่รับผิดชอบ: ${followup.team}\n` +
                `ตัวแทนทีม: ${followup.rep}\n` +
                `วันที่ติดตามผล: ${formatDate(new Date(followup.date))}\n\n` +
                `กรุณาดำเนินการติดตามผลตามแนวทางแก้ไขที่ระบุไว้`;
            // 🔗 URL เว็บที่อยากให้ปุ่มลิงก์ไป (แก้ตรงนี้เป็นของจริง)
            var linkUrl = "https://script.google.com/macros/s/" + ScriptApp.getScriptId() + "/exec?page=complainDataView&id=" + encodeURIComponent(followup.complainId);
            // ✅ payload แบบ Card + ปุ่ม
            var payload = {
                // text: text,  // fallback ถ้า Card แสดงไม่ได้
                cardsV2: [
                    {
                        cardId: "complain-card",
                        card: {
                            header: {
                                title: "แจ้งเตือนติดตามผล Complain",
                                subtitle: "ระบบ Complain",
                            },
                            sections: [
                                {
                                    widgets: [
                                        {
                                            textParagraph: {
                                                text: text.replace(/\n/g, "<br>")
                                            }
                                        },
                                        {
                                            buttonList: {
                                                buttons: [
                                                    {
                                                        text: "เปิดหน้าเว็บดูรายละเอียด",
                                                        onClick: {
                                                            openLink: {
                                                                url: linkUrl
                                                            }
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                ]
            };

            sendGoogleChatText(payload);
            Utilities.sleep(200); // Sleep for 200ms between messages to avoid rate limits
        }
    } catch (error) {
        console.error('Error in daily follow-up notification:', error);
    }
}